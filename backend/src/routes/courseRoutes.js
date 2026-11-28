import express from 'express';
import { getCourses, getCourseById, createCourse, updateCourse, updateCourseStatus, deleteCourse, getCourseThumbnail } from '../controllers/courseController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/secrets.js';

const router = express.Router();

const extractUser = (req, res, next) => {
  const possibleTokens = [];
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    possibleTokens.push(authHeader.substring(7));
  }
  if (req.query && req.query.token) {
    possibleTokens.push(req.query.token);
  }
  if (req.cookies) {
    if (req.cookies.admin_token) possibleTokens.push(req.cookies.admin_token);
    if (req.cookies.student_token) possibleTokens.push(req.cookies.student_token);
    if (req.cookies.token) possibleTokens.push(req.cookies.token);
  }
  
  for (const token of possibleTokens) {
    try {
      req.user = jwt.verify(token, getJwtSecret());
      break; // Found a valid user, stop checking
    } catch(e) {
      // Continue to the next token
    }
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

router.get('/:id/thumbnail', getCourseThumbnail);

router.route('/:id/status')
  .patch(verifyAdmin, updateCourseStatus);

export default router;
