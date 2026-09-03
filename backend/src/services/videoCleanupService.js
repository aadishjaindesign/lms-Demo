import Video from "../models/Video.js";
import { cloudinary } from "../config/cloudinary.js";
import { r2Client } from "../config/r2.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Finds all expired videos, deletes them from storage,
 * and then deletes the database record.
 */
export const cleanExpiredVideos = async () => {
  try {
    console.log("[Video Cleanup] Checking expired videos...");
    const now = new Date();
    
    // Calculate expiration fallback: 7 days ago for older videos without expiresAt
    const expirationFallback = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const expiredVideos = await Video.find({
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false }, uploadedAt: { $lte: expirationFallback } }
      ]
    });
    
    if (expiredVideos.length === 0) {
      console.log("[Video Cleanup] Found 0 expired videos");
      return;
    }

    console.log(`[Video Cleanup] Found ${expiredVideos.length} expired videos`);

    for (const video of expiredVideos) {
      try {
        if (video.storageProvider === "r2" && video.objectKey) {
          const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: video.objectKey,
          });
          await r2Client.send(command);
          console.log(`[Video Cleanup] Deleted R2 object: ${video.objectKey}`);
        } else if (video.publicId) {
          await cloudinary.uploader.destroy(video.publicId, { resource_type: "video" });
          console.log(`[Video Cleanup] Deleted Cloudinary asset: ${video.publicId}`);
        }

        // After successful storage deletion, remove the DB record
        await Video.findByIdAndDelete(video._id);
        console.log(`[Video Cleanup] Deleted database record: ${video._id}, Course: ${video.courseId}`);
      } catch (err) {
        console.error(`[Video Cleanup] Failed to delete: ID ${video._id} - Error: ${err.message}`);
      }
    }
  } catch (error) {
    console.error("[Video Cleanup] Error running cleanup job:", error);
  }
};

/**
 * Starts the interval to periodically check for and clean up expired videos.
 */
export const startVideoCleanupScheduler = () => {
  // Run immediately on server start
  cleanExpiredVideos();

  // Then run every 5 minutes (300000 ms)
  setInterval(() => {
    cleanExpiredVideos();
  }, 5 * 60 * 1000);
};
