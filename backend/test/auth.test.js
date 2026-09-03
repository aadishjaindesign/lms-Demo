import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import Admin from '../src/models/Admin.js';
import Student from '../src/models/Student.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Authentication & API Security', () => {
  let admin, student;
  
  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    admin = await Admin.create({
      email: 'admin@test.com',
      password: hash
    });
    
    student = await Student.create({
      studentId: 'STU-001',
      name: 'Test Student',
      phone: '1234567890',
      password: hash,
      status: 'active'
    });
  });

  describe('Admin Login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({ email: 'admin@test.com', password: 'password123' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/admin-login')
        .send({ email: 'admin@test.com', password: 'wrong' });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('Student Login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({ studentId: 'STU-001', password: 'password123' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });
    
    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({ studentId: 'STU-001', password: 'wrong' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('API Authorization & Middleware', () => {
    it('should return 401 if token is missing', async () => {
      const res = await request(app).get('/api/admin/dashboard-stats');
      expect(res.status).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Cookie', [`admin_token=invalid_token`]);
      expect(res.status).toBe(401);
    });

    it('should return 401 if token is expired', async () => {
      const expiredToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '-1h' });
      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Cookie', [`admin_token=${expiredToken}`]);
      expect(res.status).toBe(401);
    });

    it('should allow Admin access to Admin API', async () => {
      const validToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Cookie', [`admin_token=${validToken}`]);
      expect(res.status).toBe(200);
    });

    it('should block Student from accessing Admin API with 403', async () => {
      const studentToken = jwt.sign({ role: 'student', userId: student._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Cookie', [`student_token=${studentToken}`]);
      expect(res.status).toBe(403);
    });

    it('should resolve token pollution (valid admin + expired student)', async () => {
      const adminToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const expiredStudentToken = jwt.sign({ role: 'student', userId: student._id }, process.env.JWT_SECRET, { expiresIn: '-1h' });
      const res = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Cookie', [`student_token=${expiredStudentToken}`, `admin_token=${adminToken}`]);
      expect(res.status).toBe(200);
    });
    
    it('should allow Student access to Student API', async () => {
      const studentToken = jwt.sign({ role: 'student', userId: student._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Cookie', [`student_token=${studentToken}`]);
      expect(res.status).toBe(200);
    });

    it('should block Admin from accessing Student API with 403', async () => {
      const adminToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Cookie', [`admin_token=${adminToken}`]);
      expect(res.status).toBe(403);
    });
  });
});
