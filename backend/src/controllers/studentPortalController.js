import CourseAccess from '../models/CourseAccess.js';
import Video from '../models/Video.js';
import { hasCourseAccess } from '../services/courseAccessService.js';
import Course from '../models/Course.js';
import Student from '../models/Student.js';

export const getMyDashboard = async (req, res) => {
  try {
    const studentId = req.user.userId;
    
    // Check if student exists and is active
    const student = await Student.findById(studentId);
    if (!student || student.status !== 'active') {
      return res.status(403).json({ error: 'Your account is currently inactive.' });
    }

    const now = new Date();
    
    // Get active course count
    const activeAccessRecords = await CourseAccess.find({
      studentId,
      status: 'active',
      startDate: { $lte: now },
      expiryDate: { $gte: new Date(now.setHours(0,0,0,0)) } // roughly
    }).populate('courseId');

    // Filter where course is also active
    const activeCoursesCount = activeAccessRecords.filter(
      record => record.courseId && record.courseId.status === 'active'
    ).length;

    res.status(200).json({
      name: student.name,
      activeCoursesCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const getMyCourses = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const student = await Student.findById(studentId);
    if (!student || student.status !== 'active') {
      return res.status(403).json({ error: 'Your account is currently inactive.' });
    }

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(0,0,0,0);

    const accessRecords = await CourseAccess.find({
      studentId,
      status: 'active',
      startDate: { $lte: now }
    }).populate('courseId');

    const accessibleCourses = accessRecords.filter(record => {
      // Expiry logic
      const expiry = new Date(record.expiryDate);
      expiry.setHours(23, 59, 59, 999);
      if (now > expiry) return false;

      // Course active check
      if (!record.courseId || record.courseId.status !== 'active') return false;

      return true;
    }).map(record => ({
      _id: record.courseId._id,
      name: record.courseId.name,
      description: record.courseId.description,
      thumbnail: record.courseId.thumbnail,
      expiryDate: record.expiryDate
    }));

    // For video counts, we can fetch them or just return courses
    // To keep it performant, we might skip video count unless strictly necessary, 
    // but the prompt says "12 Videos", so let's fetch video counts
    for (let course of accessibleCourses) {
       course.videoCount = await Video.countDocuments({ courseId: course._id });
    }

    res.status(200).json(accessibleCourses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const getCourseDetails = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.params;

    const accessCheck = await hasCourseAccess(studentId, courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ error: accessCheck.reason });
    }

    const course = await Course.findById(courseId);
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
};

export const getCourseVideos = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.params;

    const accessCheck = await hasCourseAccess(studentId, courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ error: accessCheck.reason });
    }

    const videos = await Video.find({ courseId }).sort({ order: 1 });
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course videos' });
  }
};
