import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import Admin from '../src/models/Admin.js';
import Course from '../src/models/Course.js';
import CourseAccess from '../src/models/CourseAccess.js';
import Video from '../src/models/Video.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Mock the S3Client constructor and send method
vi.mock('@aws-sdk/client-s3', () => {
  const sendMock = vi.fn();
  return {
    S3Client: class {
      send = sendMock;
    },
    DeleteObjectCommand: vi.fn(),
  };
});

describe('Course Delete Cascade', () => {
  let admin, course1, course2, video1, video2, adminToken;
  
  beforeEach(async () => {
    vi.clearAllMocks();

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    admin = await Admin.create({
      email: 'admin@test.com',
      password: hash
    });
    adminToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    course1 = await Course.create({ name: 'Course 1', status: 'active' });
    course2 = await Course.create({ name: 'Course 2', status: 'active' });

    // Course 1 records
    await CourseAccess.create({
      studentId: '60c72b2f9b1d8b001c8e4a55', // dummy
      courseId: course1._id,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 10000),
      status: 'active'
    });

    video1 = await Video.create({
      courseId: course1._id,
      title: 'R2 Video',
      storageProvider: 'r2',
      objectKey: 'r2-object-key.mp4',
      status: 'active'
    });

    // Course 2 records (should not be deleted)
    await CourseAccess.create({
      studentId: '60c72b2f9b1d8b001c8e4a55', 
      courseId: course2._id,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 10000),
      status: 'active'
    });

    video2 = await Video.create({
      courseId: course2._id,
      title: 'Another Video',
      storageProvider: 'r2',
      objectKey: 'other-object.mp4',
      status: 'active'
    });
  });

  it('should cascade delete course, related access, and videos', async () => {
    const res = await request(app)
      .delete(`/api/courses/${course1._id}`)
      .set('Cookie', [`admin_token=${adminToken}`]);
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Course cascade deleted successfully');

    // Verify Course 1 is gone
    const c1 = await Course.findById(course1._id);
    expect(c1).toBeNull();

    // Verify Course 1 Access is gone
    const accesses = await CourseAccess.find({ courseId: course1._id });
    expect(accesses.length).toBe(0);

    // Verify Course 1 Videos are gone
    const videos = await Video.find({ courseId: course1._id });
    expect(videos.length).toBe(0);

    // Verify S3 DeleteObjectCommand was called
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: 'r2-object-key.mp4'
    });
    
    // Verify Course 2 data is intact
    const c2 = await Course.findById(course2._id);
    expect(c2).not.toBeNull();
    const c2Videos = await Video.find({ courseId: course2._id });
    expect(c2Videos.length).toBe(1);
  });
});
