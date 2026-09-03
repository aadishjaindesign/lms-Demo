import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import Admin from '../src/models/Admin.js';
import Student from '../src/models/Student.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Password Change Logic', () => {
  let admin, student, adminToken, studentToken;
  
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

    adminToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    studentToken = jwt.sign({ role: 'student', userId: student._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  describe('Admin Password Change', () => {
    it('should successfully change password with correct current password', async () => {
      const res = await request(app)
        .put('/api/admin/change-password')
        .set('Cookie', [`admin_token=${adminToken}`])
        .send({ currentPassword: 'password123', newPassword: 'newAdminPassword123', confirmPassword: 'newAdminPassword123' });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password updated successfully');
      
      const updatedAdmin = await Admin.findById(admin._id);
      const isMatch = await bcrypt.compare('newAdminPassword123', updatedAdmin.password);
      expect(isMatch).toBe(true);
    });

    it('should fail with wrong current password', async () => {
      const res = await request(app)
        .put('/api/admin/change-password')
        .set('Cookie', [`admin_token=${adminToken}`])
        .send({ currentPassword: 'wrongPassword', newPassword: 'newAdminPassword123', confirmPassword: 'newAdminPassword123' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Incorrect current password');
    });
    
    it('should login successfully with new password after change', async () => {
      await request(app)
        .put('/api/admin/change-password')
        .set('Cookie', [`admin_token=${adminToken}`])
        .send({ currentPassword: 'password123', newPassword: 'newAdminPassword123', confirmPassword: 'newAdminPassword123' });
        
      const resOld = await request(app)
        .post('/api/auth/admin-login')
        .send({ email: 'admin@test.com', password: 'password123' });
      expect(resOld.status).toBe(401);

      const resNew = await request(app)
        .post('/api/auth/admin-login')
        .send({ email: 'admin@test.com', password: 'newAdminPassword123' });
      expect(resNew.status).toBe(200);
    });
  });

  describe('Student Password Change', () => {
    it('should successfully change password with correct current password', async () => {
      const res = await request(app)
        .put('/api/student/password')
        .set('Cookie', [`student_token=${studentToken}`])
        .send({ currentPassword: 'password123', newPassword: 'newStudentPassword123' });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password changed successfully');
      
      const updatedStudent = await Student.findById(student._id);
      const isMatch = await bcrypt.compare('newStudentPassword123', updatedStudent.password);
      expect(isMatch).toBe(true);
    });

    it('should fail with wrong current password', async () => {
      const res = await request(app)
        .put('/api/student/password')
        .set('Cookie', [`student_token=${studentToken}`])
        .send({ currentPassword: 'wrongPassword', newPassword: 'newStudentPassword123' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Current password is incorrect.');
    });

    it('should login successfully with new password after change', async () => {
      await request(app)
        .put('/api/student/password')
        .set('Cookie', [`student_token=${studentToken}`])
        .send({ currentPassword: 'password123', newPassword: 'newStudentPassword123' });
        
      const resOld = await request(app)
        .post('/api/auth/student-login')
        .send({ studentId: 'STU-001', password: 'password123' });
      expect(resOld.status).toBe(401);

      const resNew = await request(app)
        .post('/api/auth/student-login')
        .send({ studentId: 'STU-001', password: 'newStudentPassword123' });
      expect(resNew.status).toBe(200);
    });

    it('should not allow changing another students password', async () => {
      // Create another student
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);
      const student2 = await Student.create({
        studentId: 'STU-002',
        name: 'Another Student',
        phone: '0987654321',
        password: hash,
        status: 'active'
      });
      
      // Attempt to change using API. The API implicitly uses req.user.userId from token.
      // So sending STU-002 in body won't matter, it should only change STU-001.
      const res = await request(app)
        .put('/api/student/password')
        .set('Cookie', [`student_token=${studentToken}`])
        .send({ studentId: 'STU-002', currentPassword: 'password123', newPassword: 'hackedPassword' });
        
      expect(res.status).toBe(200); // It updates STU-001 correctly, ignoring STU-002

      const updatedStudent2 = await Student.findById(student2._id);
      const isMatch = await bcrypt.compare('password123', updatedStudent2.password);
      expect(isMatch).toBe(true); // Student 2's password is unchanged
    });
  });
});
