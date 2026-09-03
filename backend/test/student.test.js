import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import Admin from '../src/models/Admin.js';
import Student from '../src/models/Student.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Student Management', () => {
  let adminToken;

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    const admin = await Admin.create({ email: 'admin@test.com', password: hash });
    adminToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Seed one student
    await Student.create({
      studentId: 'STU-100',
      name: 'Existing Student',
      phone: '1234567890',
      password: hash,
      status: 'active'
    });
    
    await Student.init();
  });

  it('should create a new student', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({
        name: 'New Student',
        phone: '9999999999',
        password: 'password123'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.studentId).toMatch(/^STU-JC\d+$/);
  });

  it('should reject invalid phone format', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({
        name: 'Duplicate Student',
        phone: '0000',
        password: 'password123'
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('10 digits');
  });

  it('should block a student', async () => {
    const student = await Student.findOne({ studentId: 'STU-100' });
    
    const res = await request(app)
      .put(`/api/students/${student._id}`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ status: 'blocked' });
      
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('blocked');
    
    // Test blocked login
    const loginRes = await request(app)
      .post('/api/auth/student-login')
      .send({ studentId: 'STU-100', password: 'password123' });
    
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error).toBe('Your account has been blocked');
  });
});
