import Video from "../models/Video.js";
import Course from "../models/Course.js";
import { cloudinary } from "../config/cloudinary.js";

// Upload video to a course
export const uploadVideo = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File missing" });
    }

    // Check if course exists
    let course;
    try {
      course = await Course.findById(courseId);
    } catch (e) {
      // Invalid ObjectId
    }

    if (!course) {
      if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: "video" }).catch(() => {});
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
      publicId: req.file.filename,
      secureUrl: req.file.path,
      order,
    });

    await video.save();

    res.status(201).json(video);
  } catch (error) {
    console.error("Upload video error:", error.message || error);
    
    // Clean up partial Cloudinary upload if DB save failed
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename, { resource_type: "video" }).catch(() => {});
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
