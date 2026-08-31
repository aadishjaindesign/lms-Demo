import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';

const generateTokenAndSetCookie = (res, payload) => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret';
  const token = jwt.sign(payload, secret, { expiresIn: '1d' });
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
  return token;
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    generateTokenAndSetCookie(res, { role: 'admin', userId: admin._id });
    res.status(200).json({ success: true, message: 'Admin logged in successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const studentLogin = async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) return res.status(400).json({ error: 'Student ID and password are required' });

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(401).json({ error: 'Invalid credentials' });
    if (student.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked' });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    generateTokenAndSetCookie(res, { role: 'student', userId: student._id });
    res.status(200).json({ success: true, message: 'Student logged in successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const logout = (req, res) => {
  res.cookie('token', '', { maxAge: 0, path: '/' });
  res.status(200).json({ success: true });
};
