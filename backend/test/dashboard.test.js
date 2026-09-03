import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import Admin from '../src/models/Admin.js';
import Student from '../src/models/Student.js';
import Course from '../src/models/Course.js';
import Video from '../src/models/Video.js';
import CourseAccess from '../src/models/CourseAccess.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Dashboard Statistics', () => {
  let adminToken;

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    const admin = await Admin.create({ email: 'admin@test.com', password: hash });
    adminToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2 Active students, 1 Blocked
    const s1 = await Student.create({ studentId: 'S1', name: 'S1', phone: '1', password: hash, status: 'active' });
    const s2 = await Student.create({ studentId: 'S2', name: 'S2', phone: '2', password: hash, status: 'active' });
    await Student.create({ studentId: 'S3', name: 'S3', phone: '3', password: hash, status: 'blocked' });

    // 2 Courses (1 active, 1 inactive)
    const c1 = await Course.create({ name: 'C1', status: 'active' });
    await Course.create({ name: 'C2', status: 'inactive' });

    // 3 Videos
    await Video.create({ courseId: c1._id, title: 'V1' });
    await Video.create({ courseId: c1._id, title: 'V2' });
    await Video.create({ courseId: c1._id, title: 'V3' });

    // 1 Active access, 1 Expired access
    const now = new Date();
    const past = new Date(now.getTime() - 100000);
    const future = new Date(now.getTime() + 100000);

    await CourseAccess.create({ studentId: s1._id, courseId: c1._id, startDate: past, expiryDate: future, status: 'active' });
    await CourseAccess.create({ studentId: s2._id, courseId: c1._id, startDate: past, expiryDate: past, status: 'active' }); // Expired
  });

  it('should return correct dynamic statistics', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard-stats')
      .set('Cookie', [`admin_token=${adminToken}`]);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    expect(res.body.data.students.total).toBe(3);
    expect(res.body.data.students.active).toBe(2);
    
    expect(res.body.data.courses.total).toBe(2);
    
    expect(res.body.data.videos.total).toBe(3);
    
    expect(res.body.data.courseAccess).toBeDefined();
  });
});
