import express from "express";
import { uploadVideo, getCourseVideos, deleteVideo, updateVideo, generateSignature, initiateMultipartUpload, completeMultipartUpload, abortMultipartUpload, getPlaybackUrl } from "../controllers/videoController.js";
import { verifyAdmin, verifyAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const checkCloudinaryConfig = (req, res, next) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: "Cloudinary configuration is incomplete" });
  }
  next();
};

// Get Cloudinary upload signature
router.get("/courses/:courseId/videos/signature", verifyAdmin, checkCloudinaryConfig, generateSignature);

// R2 Multipart Upload Routes (Admin)
router.post("/courses/:courseId/videos/multipart-upload/initiate", verifyAdmin, initiateMultipartUpload);
router.post("/courses/:courseId/videos/multipart-upload/complete", verifyAdmin, completeMultipartUpload);
router.post("/courses/:courseId/videos/multipart-upload/abort", verifyAdmin, abortMultipartUpload);

// Secure Playback Route (Admin & Student)
router.get("/courses/:courseId/videos/:videoId/playback-url", verifyAuth, getPlaybackUrl);

// Get videos for a course (admin)
router.get("/courses/:courseId/videos", verifyAdmin, getCourseVideos);

// Upload a video metadata after direct upload (admin only)
router.post("/courses/:courseId/videos", verifyAdmin, uploadVideo);

// Update a video (admin only)
router.patch("/videos/:videoId", verifyAdmin, updateVideo);

// Delete a video (admin only)
router.delete("/videos/:videoId", verifyAdmin, deleteVideo);

// --- DEVELOPMENT / TESTING ROUTES ---
import { cleanExpiredVideos } from "../services/videoCleanupService.js";
import Video from "../models/Video.js";

// Manually trigger the cleanup service
router.post("/test/trigger-cleanup", async (req, res) => {
  try {
    await cleanExpiredVideos();
    res.status(200).json({ message: "Cleanup triggered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a dummy video explicitly set to 8 days old for testing
router.post("/test/create-expired", async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: "courseId is required" });

    // Set uploadedAt to 8 days ago
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    const dummyVideo = new Video({
      courseId,
      title: "Test Expired Video",
      description: "This video should be deleted by the cleanup job.",
      publicId: `dummy-public-id-${Date.now()}`, // Note: this won't actually exist on Cloudinary, so Cloudinary deletion will throw "not found" (which is safely handled)
      secureUrl: "https://example.com/dummy.mp4",
      duration: 10,
      order: 99,
      uploadedAt: eightDaysAgo,
    });

    await dummyVideo.save();
    res.status(201).json({ message: "Expired dummy video created", video: dummyVideo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ------------------------------------

export default router;
