import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { getCache, setCache, deleteUserCache } from '../services/redisCacheService.js';
import { checkGeofence, getGeofence } from '../services/geofenceService.js';
import { istDateKey, istDayRange, formatIstTime12 } from '../utils/istDate.js';

/**
 * Get attendance statistics and records for authenticated student
 */
export const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const cacheKey = `cache:student:attendance:${studentId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const [student, records] = await Promise.all([
      Student.findById(studentId).select('name studentId enrollmentNumber').lean(),
      Attendance.find({ studentId }).sort({ date: -1 }).lean(),
    ]);

    const nonHolidays = records.filter(r => r.status !== 'holiday');
    const totalClasses = nonHolidays.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const holidayCount = records.filter(r => r.status === 'holiday').length;
    const attendedClasses = presentCount + lateCount;

    const overallPercentage = totalClasses > 0 
      ? Math.round((attendedClasses / totalClasses) * 100) 
      : 100;

    // Check if attendance has already been punched today (in IST)
    const { start: todayStart, end: todayEnd } = istDayRange(new Date());

    const todayRecord = records.find(r => {
      const d = new Date(r.date);
      return d >= todayStart && d <= todayEnd;
    });

    const isPunchedToday = Boolean(todayRecord && todayRecord.status !== 'holiday');
    const isCheckedInToday = Boolean(todayRecord && (todayRecord.checkIn || todayRecord.status === 'present' || todayRecord.status === 'late'));
    const isCheckedOutToday = Boolean(todayRecord && todayRecord.checkOut);

    // Group by Month (e.g., '2026-11')
    const monthlyMap = {};
    for (const record of records) {
      const monthKey = istDateKey(record.date).slice(0, 7);
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          total: 0,
          attended: 0,
          present: 0,
          late: 0,
          absent: 0,
          holiday: 0,
          records: [],
        };
      }
      const entry = monthlyMap[monthKey];
      if (record.status !== 'holiday') entry.total += 1;
      if (record.status === 'present' || record.status === 'late') entry.attended += 1;
      if (record.status === 'present') entry.present += 1;
      if (record.status === 'late') entry.late += 1;
      if (record.status === 'absent') entry.absent += 1;
      if (record.status === 'holiday') entry.holiday += 1;
      entry.records.push({
        id: record._id,
        date: record.date,
        status: record.status,
        checkIn: record.checkIn || null,
        checkOut: record.checkOut || null,
        duration: record.duration || null,
        topicCovered: record.topicCovered || '',
        faculty: record.faculty || 'Neha Jain',
        room: record.room || 'Classroom 2',
        classTime: record.classTime || '9:00 – 11:00 AM',
        note: record.note || '',
        punchType: record.punchType || 'self',
      });
    }

    const monthlyBreakdown = Object.values(monthlyMap).map(m => ({
      ...m,
      percentage: m.total > 0 ? Math.round((m.attended / m.total) * 100) : 100,
    }));

    const attendanceResponse = {
      success: true,
      student: student ? {
        name: student.name,
        studentId: student.enrollmentNumber || student.studentId,
      } : null,
      isPunchedToday,
      isCheckedInToday,
      isCheckedOutToday,
      todayRecord: todayRecord || null,
      summary: {
        overallPercentage,
        totalClasses,
        attendedClasses,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        holidays: holidayCount,
      },
      monthlyBreakdown,
      records: records.slice(0, 50).map(r => ({
        ...r,
        checkIn: r.checkIn || null,
        checkOut: r.checkOut || null,
        duration: r.duration || null,
        faculty: r.faculty || 'Neha Jain',
        room: r.room || 'Classroom 2',
        classTime: r.classTime || '9:00 – 11:00 AM',
        note: r.note || '',
      })),
    };

    await setCache(cacheKey, attendanceResponse, 30);
    return res.status(200).json(attendanceResponse);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error fetching attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance data' });
  }
};

/**
 * Student: Self-punch attendance for today (Supports both Check-In and Check-Out!)
 */
export const punchAttendance = async (req, res) => {
  try {
    const studentId = req.user.userId;
    await deleteUserCache(studentId);
    const student = await Student.findById(studentId);
    if (!student || student.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Your student account is inactive or not found.' });
    }

    // Location restriction: student must be inside the admin-configured office radius.
    // Uses 400 (not 403) so the frontend does not treat it as an auth failure and log the student out.
    const geo = await checkGeofence(req.body);
    if (!geo.ok) {
      return res.status(400).json({
        success: false,
        code: geo.code,
        error: geo.error,
        distance: geo.distance,
        radiusMeters: geo.radiusMeters,
      });
    }
    const punchLocation = geo.distance != null
      ? { latitude: Number(req.body.latitude), longitude: Number(req.body.longitude), distance: geo.distance }
      : undefined;

    const now = new Date();
    const { start: todayStart, end: todayEnd } = istDayRange(now);

    const calcDuration = (startStr, endStr) => {
      try {
        const parseTime = (t) => {
          const parts = (t || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!parts) return null;
          let hr = parseInt(parts[1], 10);
          const mn = parseInt(parts[2], 10);
          const isPm = parts[3].toUpperCase() === 'PM';
          if (isPm && hr !== 12) hr += 12;
          if (!isPm && hr === 12) hr = 0;
          return hr * 60 + mn;
        };
        const sMins = parseTime(startStr);
        const eMins = parseTime(endStr);
        if (sMins == null || eMins == null) return 'In session';
        const diff = Math.max(0, eMins - sMins);
        const hrs = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hrs}h ${String(mins).padStart(2, '0')}m`;
      } catch (e) {
        return 'In session';
      }
    };

    const currentTimeStr = formatIstTime12(now);

    // Look for existing attendance record for today
    let existing = await Attendance.findOne({
      studentId,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    const requestedAction = req.body?.action || req.body?.type; // 'in' | 'out' | 'checkout'

    // CASE 1: No record exists today -> Record Check In (Punch In)
    if (!existing) {
      if (requestedAction === 'out' || requestedAction === 'checkout') {
        return res.status(400).json({
          success: false,
          error: 'You have not checked in yet today. Please check in first.',
        });
      }

      const status = req.body?.status || 'present';

      const record = await Attendance.create({
        studentId,
        date: now,
        status,
        checkIn: currentTimeStr,
        checkOut: null,
        duration: 'In session',
        topicCovered: req.body?.topicCovered || 'Course Lectures & Practical Lab',
        faculty: req.body?.faculty || 'Neha Jain',
        room: req.body?.room || 'Classroom 2',
        classTime: req.body?.classTime || '9:00 – 11:00 AM',
        punchType: 'self',
        checkInLocation: punchLocation,
        note: req.body?.note || (status === 'late' ? 'Checked in after late threshold' : 'Checked in on time'),
      });

      await deleteUserCache(studentId);

      return res.status(201).json({
        success: true,
        action: 'check-in',
        message: `Attendance punched successfully! You are marked Present today. Check-in: ${currentTimeStr}`,
        record,
      });
    }

    // CASE 2: Checked in, student requests Check Out
    if (existing && (requestedAction === 'out' || requestedAction === 'checkout')) {
      if (existing.checkOut) {
        return res.status(400).json({
          success: false,
          error: `Already checked out at ${existing.checkOut}. Session duration: ${existing.duration}.`,
          record: existing,
        });
      }

      existing.checkOut = currentTimeStr;
      if (punchLocation) existing.checkOutLocation = punchLocation;
      existing.duration = calcDuration(existing.checkIn, currentTimeStr);
      await existing.save();
      await deleteUserCache(studentId);

      return res.status(200).json({
        success: true,
        action: 'check-out',
        message: `Check Out recorded at ${currentTimeStr}! Total duration: ${existing.duration}.`,
        record: existing,
      });
    }

    // CASE 3: Duplicate punch without 'out' action -> Reject duplicate punch
    return res.status(400).json({
      success: false,
      error: `Attendance already recorded for today as "${existing.status.toUpperCase()}". Duplicate punch not allowed.`,
      alreadyPunched: true,
      canCheckOut: !existing.checkOut,
      record: existing,
    });
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error punching attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to record attendance punch' });
  }
};

/**
 * Admin: Get attendance overview across all students with date filter & search
 */
export const getAdminAttendanceOverview = async (req, res) => {
  try {
    const { date, search, batch } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Build student search query
    const studentQuery = {};
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      studentQuery.$or = [
        { name: regex },
        { studentId: regex },
        { enrollmentNumber: regex },
        { phone: regex },
      ];
    }
    if (batch) {
      studentQuery.batch = batch;
    }

    const students = await Student.find(studentQuery)
      .select('name studentId enrollmentNumber phone batch status createdAt')
      .sort({ name: 1 })
      .lean();

    const studentIds = students.map(s => s._id);

    // Fetch attendance for the target day
    const dayRecords = await Attendance.find({
      studentId: { $in: studentIds },
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const dayRecordMap = new Map();
    dayRecords.forEach(r => {
      dayRecordMap.set(r.studentId.toString(), r);
    });

    // Fetch all records to compute overall percentage
    const allRecords = await Attendance.find({
      studentId: { $in: studentIds },
    }).select('studentId status date').lean();

    const studentStatsMap = new Map();
    allRecords.forEach(r => {
      const sId = r.studentId.toString();
      if (!studentStatsMap.has(sId)) {
        studentStatsMap.set(sId, { total: 0, attended: 0, present: 0, late: 0, absent: 0 });
      }
      const stats = studentStatsMap.get(sId);
      if (r.status !== 'holiday') stats.total += 1;
      if (r.status === 'present' || r.status === 'late') stats.attended += 1;
      if (r.status === 'present') stats.present += 1;
      if (r.status === 'late') stats.late += 1;
      if (r.status === 'absent') stats.absent += 1;
    });

    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;
    let unmarkedToday = 0;
    let totalPercentageSum = 0;

    const studentList = students.map(student => {
      const sId = student._id.toString();
      const todayRecord = dayRecordMap.get(sId) || null;
      const stats = studentStatsMap.get(sId) || { total: 0, attended: 0 };
      const overallPercentage = stats.total > 0 
        ? Math.round((stats.attended / stats.total) * 100) 
        : 100;

      totalPercentageSum += overallPercentage;

      const todayStatus = todayRecord ? todayRecord.status : 'unmarked';
      if (todayStatus === 'present') presentToday += 1;
      else if (todayStatus === 'late') lateToday += 1;
      else if (todayStatus === 'absent') absentToday += 1;
      else unmarkedToday += 1;

      return {
        _id: student._id,
        name: student.name,
        studentId: student.studentId,
        enrollmentNumber: student.enrollmentNumber || student.studentId,
        phone: student.phone,
        batch: student.batch || 'Batch A',
        status: student.status,
        todayStatus,
        todayRecord,
        overallPercentage,
        totalClasses: stats.total,
        attendedClasses: stats.attended,
      };
    });

    const totalStudents = students.length;
    const averagePercentage = totalStudents > 0 ? Math.round(totalPercentageSum / totalStudents) : 100;

    return res.status(200).json({
      success: true,
      date: istDateKey(startOfDay),
      summary: {
        totalStudents,
        presentToday,
        lateToday,
        absentToday,
        unmarkedToday,
        averagePercentage,
      },
      students: studentList,
    });
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error fetching admin overview:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance overview' });
  }
};

/**
 * Admin: Mark or update attendance for a student (Manual Override)
 */
export const markAttendance = async (req, res) => {
  try {
    const { studentId, date, status, topicCovered } = req.body;
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'studentId, date, and status are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    let record = await Attendance.findOne({
      studentId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (record) {
      record.status = status;
      if (topicCovered !== undefined) record.topicCovered = topicCovered;
      record.markedBy = req.user?.userId || null;
      record.punchType = 'admin';
      await record.save();
    } else {
      record = await Attendance.create({
        studentId,
        date: startOfDay,
        status,
        topicCovered: topicCovered || '',
        markedBy: req.user?.userId || null,
        punchType: 'admin',
      });
    }

    return res.status(200).json({ success: true, record });
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error marking attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark attendance' });
  }
};

/**
 * Admin: Get comprehensive attendance report for a student (for PDF export & review)
 */
export const getStudentAttendanceReport = async (req, res) => {
  try {
    const studentId = req.query.studentId || req.params.studentId;
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID is required' });
    }

    const student = await Student.findById(studentId).select('-password').lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const records = await Attendance.find({ studentId })
      .sort({ date: -1 })
      .lean();

    const nonHolidays = records.filter(r => r.status !== 'holiday');
    const totalClasses = nonHolidays.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const holidayCount = records.filter(r => r.status === 'holiday').length;
    const attendedClasses = presentCount + lateCount;
    const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;
    const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 75 ? 'B' : percentage >= 60 ? 'C' : 'D';

    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        enrollmentNumber: student.enrollmentNumber || student.studentId,
        studentId: student.studentId,
        phone: student.phone,
        email: student.email,
        batch: student.batch || 'Batch A',
        status: student.status,
      },
      summary: {
        totalClasses,
        attendedClasses,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        holidays: holidayCount,
        percentage,
        grade,
        requirementMet: percentage >= 75,
      },
      records: records.map(r => ({
        id: r._id,
        date: r.date,
        status: r.status,
        checkIn: r.checkIn || null,
        checkOut: r.checkOut || null,
        duration: r.duration || null,
        topicCovered: r.topicCovered || 'Regular Curriculum Session',
        faculty: r.faculty || 'Neha Jain',
        room: r.room || 'Classroom 2',
        classTime: r.classTime || '9:00 – 11:00 AM',
        note: r.note || '',
        punchType: r.punchType || 'self',
      })),
    });
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error generating student report:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate attendance report' });
  }
};

export default {
  getStudentAttendance,
  punchAttendance,
  getAdminAttendanceOverview,
  markAttendance,
  getStudentAttendanceReport,
};


/**
 * Student: office geofence info (so the app can tell the student where attendance is allowed)
 */
export const getStudentGeofence = async (req, res) => {
  try {
    const fence = await getGeofence();
    return res.status(200).json(fence);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Geofence fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load location settings' });
  }
};
