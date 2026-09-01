import Video from "../models/Video.js";
import Course from "../models/Course.js";
import { cloudinary } from "../config/cloudinary.js";

// Generate upload signature for direct Cloudinary chunked upload
export const generateSignature = async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "lms-videos";
    
    // Create signature using cloudinary utils
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: folder,
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
      chunkSize: parseInt(process.env.CLOUDINARY_UPLOAD_CHUNK_SIZE) || 20971520 // Default 20MB
    });
  } catch (error) {
    console.error("Generate signature error:", error);
    res.status(500).json({ error: "Failed to generate upload signature" });
  }
};

// Create video record after direct Cloudinary upload
export const uploadVideo = async (req, res) => {
  try {
    const { courseId } = req.params;
    // The video binary is uploaded directly to Cloudinary by the browser.
    // The frontend sends only the resulting metadata here.
    const { title, description, publicId, secureUrl, duration } = req.body;

    if (!publicId || !secureUrl) {
      return res.status(400).json({ error: "Video metadata missing" });
    }

    // Check if course exists
    let course;
    try {
      course = await Course.findById(courseId);
    } catch (e) {
      // Invalid ObjectId
    }

    if (!course) {
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" }).catch(() => {});
      }
      return res.status(404).json({ error: "Course not found" });
    }

    // Determine order
    const videoCount = await Video.countDocuments({ courseId });
    const order = videoCount + 1;

    const video = new Video({
      courseId,
      title: title || "Untitled Video",
      description: description || "",
      publicId: publicId,
      secureUrl: secureUrl,
      duration: duration || 0,
      order,
    });

    await video.save();

    res.status(201).json(video);
  } catch (error) {
    console.error("Upload video DB save error:", error.message || error);
    
    // Clean up Cloudinary upload if MongoDB DB save failed
    if (req.body && req.body.publicId) {
      await cloudinary.uploader.destroy(req.body.publicId, { resource_type: "video" }).catch(() => {});
    }
    
    res.status(500).json({ error: "Database save failed" });
  }
};

// Get all videos for a course
export const getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;
    const videos = await Video.find({ courseId }).sort({ order: 1 });
    res.status(200).json(videos);
  } catch (error) {
    console.error("Get course videos error:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
};

// Delete a video
export const deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Delete from Cloudinary
    if (video.publicId) {
      await cloudinary.uploader.destroy(video.publicId, { resource_type: "video" });
    }

    // Delete from DB
    await Video.findByIdAndDelete(videoId);

    // Reorder remaining videos
    const remainingVideos = await Video.find({ courseId: video.courseId }).sort({ order: 1 });
    for (let i = 0; i < remainingVideos.length; i++) {
      remainingVideos[i].order = i + 1;
      await remainingVideos[i].save();
    }

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
};
