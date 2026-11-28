import Course from '../models/Course.js';
import Video from '../models/Video.js';
import CourseAccess from '../models/CourseAccess.js';
import { r2Client } from '../config/r2.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { cloudinary } from '../config/cloudinary.js';
import mongoose from 'mongoose';
import { publicThumbnail, decodeThumbnail, isThumbnailPath } from '../utils/courseThumbnail.js';

export const getCourses = async (req, res) => {
  try {
    const matchQuery = {};
    if (req.user?.role !== 'admin') {
      matchQuery.status = 'active';
    }

    // Two cheap queries in parallel instead of a $lookup that pulled every video
    // document into memory just to count them. Video counts use the courseId index.
    const [courses, videoCounts] = await Promise.all([
      Course.find(matchQuery).sort({ createdAt: -1 }).lean(),
      Video.aggregate([{ $group: { _id: '$courseId', count: { $sum: 1 } } }]),
    ]);

    const countByCourse = new Map(videoCounts.map((v) => [String(v._id), v.count]));

    res.status(200).json(courses.map((course) => ({
      ...course,
      thumbnail: publicThumbnail(course),
      videoCount: countByCourse.get(String(course._id)) || 0,
    })));
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Public image endpoint for thumbnails stored as data URLs. Cached for a year by the
// browser; the ?v= query (course.updatedAt) changes whenever the course is edited.
export const getCourseThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).end();

    const course = await Course.findById(id).select('thumbnail').lean();
    const decoded = decodeThumbnail(course?.thumbnail);
    if (!decoded) return res.status(404).end();

    res.set({
      'Content-Type': decoded.contentType,
      'Content-Length': decoded.buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.status(200).send(decoded.buffer);
  } catch (error) {
    console.error("Error serving course thumbnail:", error);
    res.status(500).end();
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).lean();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    course.thumbnail = publicThumbnail(course);

    if (req.user?.role !== 'admin' && course.status === 'inactive') {
      return res.status(403).json({ error: 'Course is not available' });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { name, description, thumbnail, status } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Course name is required' });

    const course = await Course.create({
      name: name.trim(),
      description: description?.trim(),
      thumbnail: thumbnail?.trim(),
      status: status || 'active',
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create course' });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    // The edit form gets the short /courses/:id/thumbnail path from the list API; if it
    // comes back unchanged, keep the stored image instead of overwriting it with the path.
    if (isThumbnailPath(updateData.thumbnail)) delete updateData.thumbnail;

    // Status update is now allowed from this general update route

    const course = await Course.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();
    if (!course) return res.status(404).json({ error: 'Course not found' });

    res.status(200).json({ ...course, thumbnail: publicThumbnail(course) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course' });
  }
};

export const updateCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const course = await Course.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course status' });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Verify Course exists
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // 2. Fetch all Videos
    const videos = await Video.find({ courseId: id });
    
    const errors = [];
    const deletedVideoIds = [];
    
    // 3. Delete Physical Files
    for (const video of videos) {
      try {
        if (video.storageProvider === 'r2' && video.objectKey) {
          const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: video.objectKey,
          });
          await r2Client.send(command);
        } else if (video.storageProvider === 'cloudinary' && video.publicId) {
          await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
        }
        deletedVideoIds.push(video._id);
      } catch (err) {
        console.error(`Failed to delete physical video ${video._id}:`, err);
        errors.push(`Failed to delete video: ${video.title || video._id}`);
      }
    }
    
    if (errors.length > 0) {
      // Partial failure. Do not delete course.
      // But we can clean up the DB records for videos that did succeed.
      if (deletedVideoIds.length > 0) {
         await Video.deleteMany({ _id: { $in: deletedVideoIds } });
      }
      return res.status(500).json({ 
        error: 'Failed to completely delete course due to storage errors.', 
        details: errors 
      });
    }

    // 4. Delete Video DB records (all succeeded)
    await Video.deleteMany({ courseId: id });

    // 5. Delete CourseAccess records
    await CourseAccess.deleteMany({ courseId: id });

    // 6. Delete Course
    await Course.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Course cascade deleted successfully' });
  } catch (error) {
    console.error('Course cascade delete error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};
