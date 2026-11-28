import CourseAccess from '../models/CourseAccess.js';
import Course from '../models/Course.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import { invalidateCourseAccessCache } from '../services/courseAccessService.js';
import { endOfIstDay } from '../utils/istDate.js';

export const getStudentCourseAccess = async (req, res) => {
  try {
    const { studentId } = req.params;
    const accessRecords = await CourseAccess.find({ studentId }).populate('courseId', 'name status');
    res.status(200).json(accessRecords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course access records' });
  }
};

export const assignCourse = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseId, startDate, expiryDate } = req.body;

    if (!courseId || !startDate || !expiryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (new Date(startDate) >= new Date(expiryDate)) {
      return res.status(400).json({ error: 'Expiry date must be after start date' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existingAccess = await CourseAccess.findOne({ studentId, courseId });
    if (existingAccess) {
      return res.status(400).json({ error: 'Student already has access to this course' });
    }

    const newAccess = await CourseAccess.create({
      studentId,
      courseId,
      startDate,
      expiryDate,
      status: 'active'
    });

    if (student.assignedCourses && !student.assignedCourses.includes(courseId.toString())) {
      student.assignedCourses.push(courseId.toString());
      await student.save();
    }

    invalidateCourseAccessCache(studentId, courseId);

    res.status(201).json(newAccess);
  } catch (error) {
    if (error.code === 11000) {
       return res.status(400).json({ error: 'Student already has access to this course' });
    }
    res.status(500).json({ error: 'Failed to assign course' });
  }
};

export const editCourseAccess = async (req, res) => {
  try {
    const { studentId, accessId } = req.params;
    const { courseId, startDate, expiryDate } = req.body;

    if (new Date(startDate) >= new Date(expiryDate)) {
      return res.status(400).json({ error: 'Expiry date must be after start date' });
    }

    const access = await CourseAccess.findOne({ _id: accessId, studentId });
    if (!access) return res.status(404).json({ error: 'Access record not found' });

    if (courseId && courseId !== access.courseId.toString()) {
      const duplicate = await CourseAccess.findOne({ studentId, courseId });
      if (duplicate) {
        return res.status(400).json({ error: 'Student already has access to the selected course' });
      }
      access.courseId = courseId;
    }

    access.startDate = startDate;
    access.expiryDate = expiryDate;
    await access.save();

    invalidateCourseAccessCache(studentId, access.courseId);

    res.status(200).json(access);
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit course access' });
  }
};

export const revokeCourseAccess = async (req, res) => {
  try {
    const { studentId, accessId } = req.params;
    const access = await CourseAccess.findOneAndUpdate(
      { _id: accessId, studentId },
      { status: 'revoked' },
      { new: true }
    );
    if (!access) return res.status(404).json({ error: 'Access record not found' });
    invalidateCourseAccessCache(studentId, access.courseId);
    res.status(200).json(access);
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke course access' });
  }
};

export const restoreCourseAccess = async (req, res) => {
  try {
    const { studentId, accessId } = req.params;
    
    const access = await CourseAccess.findOne({ _id: accessId, studentId });
    if (!access) return res.status(404).json({ error: 'Access record not found' });

    const course = await Course.findById(access.courseId);
    if (!course) {
      return res.status(400).json({ error: 'Cannot restore access: Course no longer exists' });
    }
    if (course.status !== 'active') {
      return res.status(400).json({ error: 'Cannot restore access: Course is currently inactive' });
    }
    
    if (new Date() > endOfIstDay(access.expiryDate)) {
       return res.status(400).json({ error: 'Cannot restore access: Expiry date has passed. Please extend first.' });
    }

    access.status = 'active';
    await access.save();

    invalidateCourseAccessCache(studentId, access.courseId);

    res.status(200).json(access);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore course access' });
  }
};

export const deleteCourseAccess = async (req, res) => {
  try {
    const { studentId, accessId } = req.params;

    const access = await CourseAccess.findOneAndDelete({ _id: accessId, studentId });
    if (!access) return res.status(404).json({ error: 'Access record not found' });

    invalidateCourseAccessCache(studentId, access.courseId);

    // Remove the courseId from the student's assignedCourses array to keep counts accurate
    const student = await Student.findById(studentId);
    if (student && student.assignedCourses) {
      student.assignedCourses = student.assignedCourses.filter(
        id => id.toString() !== access.courseId.toString()
      );
      await student.save();
    }

    res.status(200).json({ success: true, message: 'Course access deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course access' });
  }
};

// Assign one course to many students at once. Students who already have access are skipped.
export const bulkAssignCourse = async (req, res) => {
  try {
    const { courseId, studentIds, startDate, expiryDate } = req.body;

    if (!courseId || !Array.isArray(studentIds) || studentIds.length === 0 || !startDate || !expiryDate) {
      return res.status(400).json({ error: 'Course, dates and at least one student are required' });
    }
    if (new Date(startDate) >= new Date(expiryDate)) {
      return res.status(400).json({ error: 'Expiry date must be after start date' });
    }

    const ids = [...new Set(studentIds.map(String))];

    // Round 1: the three lookups run in parallel (DB is remote, so fewer sequential trips = faster)
    const [courseExists, students, existing] = await Promise.all([
      Course.exists({ _id: courseId }),
      Student.find({ _id: { $in: ids } }).select('_id').lean(),
      CourseAccess.find({ courseId, studentId: { $in: ids } }).select('studentId').lean(),
    ]);
    if (!courseExists) return res.status(404).json({ error: 'Course not found' });

    const validIds = students.map((s) => s._id.toString());
    const alreadyIds = new Set(existing.map((a) => a.studentId.toString()));
    const toAssign = validIds.filter((id) => !alreadyIds.has(id));

    // Round 2: writes in parallel
    if (toAssign.length > 0) {
      await Promise.all([
        CourseAccess.insertMany(
          toAssign.map((studentId) => ({ studentId, courseId, startDate, expiryDate, status: 'active' })),
          { ordered: false }
        ).catch((err) => {
          if (err.code !== 11000 && !err.writeErrors) throw err; // ignore duplicate races only
        }),
        Student.updateMany({ _id: { $in: toAssign } }, { $addToSet: { assignedCourses: courseId.toString() } }),
      ]);
      toAssign.forEach((studentId) => invalidateCourseAccessCache(studentId, courseId));
    }

    res.status(201).json({
      success: true,
      assigned: toAssign.length,
      skipped: validIds.length - toAssign.length,
    });
  } catch (error) {
    console.error('[COURSE_ACCESS] Bulk assign error:', error);
    res.status(500).json({ error: 'Failed to assign course to students' });
  }
};

// IDs of students who already have an access record for this course (used by the bulk-assign picker)
export const getCourseAssignedStudentIds = async (req, res) => {
  try {
    const records = await CourseAccess.find({ courseId: req.params.courseId }).select('studentId').lean();
    res.status(200).json({ studentIds: records.map((r) => r.studentId.toString()) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assigned students' });
  }
};

// Every student linked to a course: CourseAccess records + legacy Student.assignedCourses links
const loadCourseRoster = async (courseId) => {
  const [records, legacyStudents] = await Promise.all([
    CourseAccess.find({ courseId })
      .populate('studentId', 'name phone studentId status')
      .sort({ createdAt: -1 })
      .lean(),
    // Older students were linked only via Student.assignedCourses (no CourseAccess record)
    Student.find({ assignedCourses: String(courseId) }).select('name phone studentId status').lean(),
  ]);
  const now = new Date();
  const withAccess = new Set(records.filter((r) => r.studentId).map((r) => r.studentId._id.toString()));
  const legacy = legacyStudents
    .filter((s) => !withAccess.has(s._id.toString()))
    .map((s) => ({
      accessId: `legacy-${s._id}`,
      _id: s._id,
      name: s.name,
      phone: s.phone,
      studentId: s.studentId,
      startDate: null,
      expiryDate: null,
      accessStatus: 'active',
    }));
  const list = records
    .filter((r) => r.studentId)
    .map((r) => ({
      accessId: r._id,
      _id: r.studentId._id,
      name: r.studentId.name,
      phone: r.studentId.phone,
      studentId: r.studentId.studentId,
      startDate: r.startDate,
      expiryDate: r.expiryDate,
      accessStatus: r.status === 'revoked' ? 'revoked' : endOfIstDay(r.expiryDate) < now ? 'expired' : 'active',
    }));
  return [...list, ...legacy];
};

// Students enrolled in a course, with their access dates/status (for the teacher's roster view)
export const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    res.status(200).json(await loadCourseRoster(courseId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course students' });
  }
};

// Remove a student from a course entirely (CourseAccess records + legacy assignedCourses link)
export const removeStudentFromCourse = async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    const [del, upd] = await Promise.all([
      CourseAccess.deleteMany({ courseId, studentId }),
      Student.updateOne({ _id: studentId }, { $pull: { assignedCourses: String(courseId) } }),
    ]);
    if (!del.deletedCount && !upd.modifiedCount) {
      return res.status(404).json({ error: 'Student is not assigned to this course' });
    }
    invalidateCourseAccessCache(studentId, courseId);
    res.status(200).json({ success: true, message: 'Student removed from course' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove student from course' });
  }
};

// Admin: who among this course's students marked attendance on a given day (IST)
export const getCourseAttendance = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { date } = req.query;
    let y, m, d;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      [y, m, d] = date.split('-').map(Number);
      m -= 1;
    } else {
      const now = new Date();
      [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];
    }
    const startOfDay = new Date(y, m, d);
    const endOfDay = new Date(y, m, d, 23, 59, 59, 999);

    // Only students whose access is live count toward the class strength
    const roster = (await loadCourseRoster(courseId)).filter((s) => s.accessStatus === 'active');
    const records = await Attendance.find({
      studentId: { $in: roster.map((s) => s._id) },
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .select('studentId status checkIn checkOut duration')
      .lean();
    const byStudent = new Map(records.map((r) => [r.studentId.toString(), r]));

    const marked = [];
    const notMarked = [];
    for (const s of roster) {
      const base = { _id: s._id, name: s.name, phone: s.phone, studentId: s.studentId };
      const r = byStudent.get(s._id.toString());
      // An "absent" record set by admin is not a punch — treat as not marked
      if (r && r.status !== 'absent') {
        marked.push({ ...base, status: r.status, checkIn: r.checkIn, checkOut: r.checkOut, duration: r.duration });
      } else {
        notMarked.push({ ...base, status: r ? r.status : null });
      }
    }
    marked.sort((a, b) => String(a.checkIn || '').localeCompare(String(b.checkIn || '')));
    notMarked.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    const pad = (n) => String(n).padStart(2, '0');
    res.status(200).json({
      date: `${y}-${pad(m + 1)}-${pad(d)}`,
      total: roster.length,
      markedCount: marked.length,
      notMarkedCount: notMarked.length,
      marked,
      notMarked,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course attendance' });
  }
};
