import express from "express";
import { uploadVideo, getCourseVideos, deleteVideo, generateSignature } from "../controllers/videoController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

const checkCloudinaryConfig = (req, res, next) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: "Cloudinary configuration is incomplete" });
  }
  next();
};

// Get Cloudinary upload signature
router.get("/courses/:courseId/videos/signature", verifyAdmin, checkCloudinaryConfig, generateSignature);

// Get videos for a course (admin)
router.get("/courses/:courseId/videos", verifyAdmin, getCourseVideos);

// Upload a video metadata after direct upload (admin only)
router.post("/courses/:courseId/videos", verifyAdmin, uploadVideo);

// Delete a video (admin only)
router.delete("/videos/:videoId", verifyAdmin, deleteVideo);

export default router;
