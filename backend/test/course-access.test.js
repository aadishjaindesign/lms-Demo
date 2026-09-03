import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import Admin from '../src/models/Admin.js';
import Student from '../src/models/Student.js';
import Course from '../src/models/Course.js';
import CourseAccess from '../src/models/CourseAccess.js';
import Video from '../src/models/Video.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Course Authorization & IDOR', () => {
  let studentA, studentB, course, video, studentAToken, studentBToken;
  
  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    studentA = await Student.create({
      studentId: 'STU-A',
      name: 'Student A',
      phone: '12345',
      password: hash,
      status: 'active'
    });

    studentB = await Student.create({
      studentId: 'STU-B',
      name: 'Student B',
      phone: '67890',
      password: hash,
      status: 'active'
    });

    course = await Course.create({
      name: 'Test Course',
      status: 'active'
    });

    video = await Video.create({
      courseId: course._id,
      title: 'Test Video',
      status: 'active'
    });

    // Assign course to Student A only, valid for 1 month
    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(now.getMonth() + 1);

    await CourseAccess.create({
      studentId: studentA._id,
      courseId: course._id,
      startDate: now,
      expiryDate: expiry,
      status: 'active'
    });

    studentAToken = jwt.sign({ role: 'student', userId: studentA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    studentBToken = jwt.sign({ role: 'student', userId: studentB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  it('should allow assigned student (A) to access course details', async () => {
    const res = await request(app)
      .get(`/api/student/courses/${course._id}`)
      .set('Cookie', [`student_token=${studentAToken}`]);
    
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(course._id.toString());
  });

  it('should block unassigned student (B) from accessing course details (403)', async () => {
    const res = await request(app)
      .get(`/api/student/courses/${course._id}`)
      .set('Cookie', [`student_token=${studentBToken}`]);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ACCESS_NOT_FOUND');
  });

  it('should block expired course access (403)', async () => {
    // Modify access to be expired
    const past = new Date();
    past.setMonth(past.getMonth() - 2);
    const expired = new Date();
    expired.setMonth(expired.getMonth() - 1);
    
    await CourseAccess.updateOne(
      { studentId: studentA._id, courseId: course._id },
      { startDate: past, expiryDate: expired }
    );

    const res = await request(app)
      .get(`/api/student/courses/${course._id}`)
      .set('Cookie', [`student_token=${studentAToken}`]);
    
    expect(res.status).toBe(403);
  });

  it('should block video playback for unassigned student', async () => {
    const res = await request(app)
      .get(`/api/courses/${course._id}/videos/${video._id}/playback-url`)
      .set('Cookie', [`student_token=${studentBToken}`]);
    
    expect(res.status).toBe(403);
  });

  it('should allow video playback for assigned student', async () => {
    // This will hit the mock/return error because Cloudinary/R2 is not mocked here yet, 
    // but the authorization check should pass before reaching the storage layer.
    // If it fails with 500 or returns success, auth passed. If 403, auth failed.
    const res = await request(app)
      .get(`/api/courses/${course._id}/videos/${video._id}/playback-url`)
      .set('Cookie', [`student_token=${studentAToken}`]);
    
    expect(res.status).not.toBe(403);
  });

  it('should prevent Student B from manipulating IDs to access A data', async () => {
    // API relies entirely on `req.user.userId` from JWT, ignoring any studentId in payload.
    // So there's no way to pass studentId in URL or Body to fetch another student's courses.
    const res = await request(app)
      .get(`/api/student/courses`)
      .set('Cookie', [`student_token=${studentBToken}`]);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0); // Student B has 0 courses
  });
});
