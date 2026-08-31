import express from 'express';
import { adminLogin, studentLogin, logout } from '../controllers/authController.js';

const router = express.Router();

router.post('/admin-login', adminLogin);
router.post('/student-login', studentLogin);
router.post('/logout', logout);

export default router;
