import express from 'express';
import { getStudents, getStudentById, createStudent, updateStudent, deleteStudent } from '../controllers/studentController.js';
import { getStudentCourseAccess, assignCourse, bulkAssignCourse, getCourseStudents, getCourseAssignedStudentIds, editCourseAccess, revokeCourseAccess, restoreCourseAccess, deleteCourseAccess } from '../controllers/courseAccessController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';
import { verifyAdminGateway } from '../middleware/adminSecurityMiddleware.js';

const router = express.Router();

router.use(verifyAdminGateway); // Ensure Admin Gateway token is verified
router.use(verifyAdmin); // Protect all student routes for Admin only

router.route('/')
  .get(getStudents)
  .post(createStudent);

router.get('/course-students/:courseId', getCourseStudents);
router.post('/bulk-course-access', bulkAssignCourse);
router.get('/course-access-ids/:courseId', getCourseAssignedStudentIds);

router.route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .delete(deleteStudent);

// Course Access Routes
router.route('/:studentId/course-access')
  .get(getStudentCourseAccess)
  .post(assignCourse);

router.route('/:studentId/course-access/:accessId')
  .patch(editCourseAccess)
  .delete(deleteCourseAccess);

router.route('/:studentId/course-access/:accessId/revoke')
  .patch(revokeCourseAccess);

router.route('/:studentId/course-access/:accessId/restore')
  .patch(restoreCourseAccess);

export default router;
