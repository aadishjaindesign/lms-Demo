import CourseAccess from '../models/CourseAccess.js';
import Video from '../models/Video.js';
import { hasCourseAccess } from '../services/courseAccessService.js';
import Course from '../models/Course.js';
import Student from '../models/Student.js';
import FeeRecord from '../models/FeeRecord.js';
import Attendance from '../models/Attendance.js';
import bcrypt from 'bcryptjs';
import { invalidateUserSessionCache } from '../middleware/authMiddleware.js';
import { processFeeSyncJob } from '../services/feeService.js';
import { testErpBridgeConnection } from '../services/erp/httpAdapter.js';
import { getCache, setCache, deleteUserCache } from '../services/redisCacheService.js';
import { encryptPassword } from '../utils/passwordVault.js';

export const getMyDashboard = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const cacheKey = `cache:student:dashboard:${studentId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Fetch student info, course access, fees, and attendance in parallel
    let [student, assignedCoursesCount, feeRecord, attendanceRecords] = await Promise.all([
      Student.findById(studentId).select('name studentId phone status enrollmentNumber isErpVerified fatherName batch createdAt').lean(),
      CourseAccess.countDocuments({ studentId }),
      FeeRecord.findOne({ studentId }).lean(),
      Attendance.find({ studentId }).select('status').lean(),
    ]);

    if (!student || student.status !== 'active') {
      return res.status(403).json({ error: 'Your account is currently inactive.' });
    }

    // Auto-sync real-time ERP fee data if missing
    if (!feeRecord && (student.enrollmentNumber || student.studentId)) {
      try {
        const synced = await processFeeSyncJob({
          studentId,
          enrollmentNumber: student.enrollmentNumber || student.studentId,
        });
        if (synced) {
          feeRecord = synced.toObject ? synced.toObject() : synced;
        }
      } catch (syncErr) {
        console.warn('[STUDENT_DASHBOARD] Deferred fee sync:', syncErr.message);
      }
    }

    // Dynamic Fee Dues & Alert Calculation
    let feeAlert = {
      hasDue: false,
      dueAmount: 0,
      paidAmount: 0,
      totalAmount: 0,
      feePercentage: 100,
      dueDate: null,
      severity: 'success',
      message: 'All your course fees are currently settled.',
      installmentStatus: 'All Clear',
    };

    if (feeRecord) {
      const totalAmount = feeRecord.totalAmount || 0;
      const paidAmount = feeRecord.paidAmount || 0;
      const dueAmount = feeRecord.dueAmount || 0;
      const dueDate = feeRecord.dueDate ? new Date(feeRecord.dueDate) : null;
      const hasDue = dueAmount > 0;
      const feePercentage = totalAmount > 0
        ? Math.min(100, Math.max(0, Math.round((paidAmount / totalAmount) * 100)))
        : (hasDue ? 0 : 100);

      const installments = feeRecord.installments || [];
      const totalInstallments = installments.length;
      const paidInstallments = installments.filter(i => i.status === 'paid').length;
      const installmentStatus = totalInstallments > 0 ? `${paidInstallments}/${totalInstallments}` : (hasDue ? 'Due' : 'All Clear');

      if (hasDue) {
        const now = new Date();
        const isOverdue = dueDate && now > dueDate;
        const diffDays = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null;

        let severity = 'warning';
        let message = '';
        const formattedAmount = `₹${dueAmount.toLocaleString('en-IN')}`;

        if (isOverdue) {
          severity = 'danger';
          const overdueDays = Math.abs(diffDays);
          message = `Immediate Action Required: An overdue fee installment of ${formattedAmount} was due on ${dueDate.toLocaleDateString('en-GB')} (overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}). Please clear dues immediately to avoid portal disruption.`;
        } else if (diffDays !== null && diffDays <= 7) {
          severity = 'warning';
          message = `Upcoming Due Reminder: Course fee installment of ${formattedAmount} is due in ${diffDays} day${diffDays === 1 ? '' : 's'} (${dueDate.toLocaleDateString('en-GB')}).`;
        } else {
          severity = 'info';
          message = `Upcoming fee installment of ${formattedAmount} is scheduled for ${dueDate ? dueDate.toLocaleDateString('en-GB') : 'the next cycle'}.`;
        }

        feeAlert = {
          hasDue: true,
          dueAmount,
          paidAmount,
          totalAmount,
          feePercentage,
          dueDate,
          severity,
          message,
          installmentStatus,
        };
      } else {
        feeAlert = {
          hasDue: false,
          dueAmount: 0,
          paidAmount,
          totalAmount,
          feePercentage: 100,
          dueDate: null,
          severity: 'success',
          message: 'All your course fees are currently settled.',
          installmentStatus: totalInstallments > 0 ? `${totalInstallments}/${totalInstallments}` : 'All Clear',
        };
      }
    }

    // Attendance Summary
    let attendanceSummary = { overallPercentage: 0, totalClasses: 0, attendedClasses: 0 };
    if (attendanceRecords && attendanceRecords.length > 0) {
      const nonHolidays = attendanceRecords.filter(r => r.status !== 'holiday');
      const attended = nonHolidays.filter(r => r.status === 'present' || r.status === 'late').length;
      const total = nonHolidays.length;
      attendanceSummary = {
        overallPercentage: total > 0 ? Math.round((attended / total) * 100) : 0,
        totalClasses: total,
        attendedClasses: attended,
      };
    }

    const dashboardData = {
      name: student.name,
      studentId: student.studentId,
      enrollmentNumber: student.enrollmentNumber || student.studentId,
      phone: student.phone,
      status: student.status,
      isErpVerified: student.isErpVerified || false,
      createdAt: student.createdAt,
      assignedCoursesCount,
      feeAlert,
      attendanceSummary,
    };

    await setCache(cacheKey, dashboardData, 45);
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('[STUDENT_DASHBOARD] Error loading dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const getMyFees = async (req, res) => {
  try {
    const studentId = req.user.userId;
    let feeRecord = await FeeRecord.findOne({ studentId }).lean();

    // Ensure live fee data is loaded from ERP
    if (!feeRecord) {
      const student = await Student.findById(studentId).select('studentId enrollmentNumber').lean();
      if (student?.enrollmentNumber || student?.studentId) {
        const synced = await processFeeSyncJob({
          studentId,
          enrollmentNumber: student.enrollmentNumber || student.studentId,
        });
        if (synced) {
          feeRecord = synced.toObject ? synced.toObject() : synced;
        }
      }
    }

    if (!feeRecord) {
      return res.status(200).json({
        success: true,
        feeRecord: {
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          dueDate: null,
          feeStatus: 'paid',
          installments: [],
        },
      });
    }

    res.status(200).json({
      success: true,
      feeRecord,
    });
  } catch (error) {
    console.error('[STUDENT_FEES] Error loading fees:', error);
    res.status(500).json({ error: 'Failed to fetch fee details' });
  }
};

export const getBridgeDiagnostic = async (req, res) => {
  try {
    const result = await testErpBridgeConnection();
    res.status(200).json({
      success: true,
      diagnostic: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMyCourses = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const cacheKey = `cache:student:courses:${studentId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const student = await Student.findById(studentId).select('_id status').lean();
    if (!student || student.status !== 'active') {
      return res.status(403).json({ error: 'Your account is currently inactive.' });
    }

    const now = new Date();

    const accessRecords = await CourseAccess.find({
      studentId,
      status: 'active',
      startDate: { $lte: now }
    }).populate('courseId').lean();

    const accessibleCourses = accessRecords.filter(record => {
      // Expiry logic
      const expiry = new Date(record.expiryDate);
      expiry.setHours(23, 59, 59, 999);
      if (now > expiry) return false;

      // Course must exist
      if (!record.courseId) return false;

      return true;
    }).map(record => ({
      _id: record.courseId._id,
      name: record.courseId.name,
      description: record.courseId.description,
      thumbnail: record.courseId.thumbnail,
      status: record.courseId.status,
      expiryDate: record.expiryDate,
      videoCount: 0
    }));

    // Batch aggregate video counts for ALL courses in a SINGLE query instead of an N+1 loop
    if (accessibleCourses.length > 0) {
      const courseIds = accessibleCourses.map(c => c._id);
      const videoCounts = await Video.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        { $group: { _id: "$courseId", count: { $sum: 1 } } }
      ]);
      const countMap = new Map(videoCounts.map(item => [item._id.toString(), item.count]));
      for (const course of accessibleCourses) {
        course.videoCount = countMap.get(course._id.toString()) || 0;
      }
    }

    await setCache(cacheKey, accessibleCourses, 45);
    res.status(200).json(accessibleCourses);
  } catch (error) {
    console.error("Error fetching student courses:", error);
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

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courseObj = { ...course };
    if (accessCheck.accessRecord) {
      courseObj.expiryDate = accessCheck.accessRecord.expiryDate;
    }
    res.status(200).json(courseObj);
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

    const videos = await Video.find({ courseId }).sort({ createdAt: -1 }).lean();
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course videos' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const student = await Student.findById(studentId);
    if (!student || student.status !== 'active') {
      return res.status(403).json({ error: 'Your account is currently inactive' });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    student.passwordEnc = encryptPassword(newPassword); // admin can still see the current password
    student.plainPassword = undefined; // remove any legacy plain-text copy
    await student.save();

    invalidateUserSessionCache(studentId);

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
};

// Backfill the real video length (seconds) reported by the player, only when it is not stored yet.
export const reportVideoDuration = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId, videoId } = req.params;
    const duration = Math.round(Number(req.body?.duration));
    if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 3600) {
      return res.status(400).json({ error: 'Invalid duration' });
    }
    const accessCheck = await hasCourseAccess(studentId, courseId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ error: accessCheck.reason });
    }
    await Video.updateOne(
      { _id: videoId, courseId, $or: [{ duration: { $exists: false } }, { duration: { $lte: 0 } }] },
      { $set: { duration } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save duration' });
  }
};
