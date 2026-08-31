import express from 'express';
import { getCourses, getCourseById, createCourse, updateCourse, updateCourseStatus, deleteCourse } from '../controllers/courseController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const extractUser = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
    } catch(e) {}
  }
  next();
};

router.route('/')
  .get(extractUser, getCourses)
  .post(verifyAdmin, createCourse);

router.route('/:id')
  .get(extractUser, getCourseById)
  .patch(verifyAdmin, updateCourse)
  .delete(verifyAdmin, deleteCourse);

router.route('/:id/status')
  .patch(verifyAdmin, updateCourseStatus);

export default router;
