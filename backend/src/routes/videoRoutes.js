import express from "express";
import { uploadVideo, getCourseVideos, deleteVideo } from "../controllers/videoController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

const checkCloudinaryConfig = (req, res, next) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: "Cloudinary configuration is incomplete" });
  }
  next();
};

const uploadWrapper = (req, res, next) => {
  const uploader = upload.single("video");
  uploader(req, res, function (err) {
    if (err) {
      console.error("Cloudinary/Multer Error:", err.message, err.name);
      return res.status(500).json({ error: "Cloudinary upload failed" });
    }
    next();
  });
};

// Get videos for a course (admin)
router.get("/courses/:courseId/videos", verifyAdmin, getCourseVideos);

// Upload a video (admin only)
router.post("/courses/:courseId/videos", verifyAdmin, checkCloudinaryConfig, uploadWrapper, uploadVideo);

// Delete a video (admin only)
router.delete("/videos/:videoId", verifyAdmin, deleteVideo);

export default router;
