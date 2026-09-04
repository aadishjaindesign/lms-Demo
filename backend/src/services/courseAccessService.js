import CourseAccess from '../models/CourseAccess.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';

export const hasCourseAccess = async (studentId, courseId) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) return { hasAccess: false, reason: 'STUDENT_NOT_FOUND' };
    if (student.status !== 'active') return { hasAccess: false, reason: 'STUDENT_BLOCKED' };

    const course = await Course.findById(courseId);
    if (!course) return { hasAccess: false, reason: 'COURSE_NOT_FOUND' };

    const access = await CourseAccess.findOne({ studentId, courseId });
    if (!access) return { hasAccess: false, reason: 'ACCESS_NOT_FOUND' };
    if (access.status === 'revoked') return { hasAccess: false, reason: 'ACCESS_REVOKED' };

    const now = new Date();
    // Reset time components for accurate date-only comparison if needed, but standard Date comparison is usually fine
    
    if (now < new Date(access.startDate)) return { hasAccess: false, reason: 'ACCESS_NOT_STARTED' };
    
    // Set expiry to the very end of the expiryDate day
    const expiry = new Date(access.expiryDate);
    expiry.setHours(23, 59, 59, 999);
    if (now > expiry) return { hasAccess: false, reason: 'ACCESS_EXPIRED' };

    return { hasAccess: true, reason: null };
  } catch (error) {
    console.error("Error checking course access:", error);
    return { hasAccess: false, reason: 'INTERNAL_ERROR' };
  }
};
