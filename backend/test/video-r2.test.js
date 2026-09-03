import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import Admin from '../src/models/Admin.js';
import Course from '../src/models/Course.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock S3 components
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = vi.fn().mockResolvedValue({ UploadId: 'mock-upload-id' })
    },
    CreateMultipartUploadCommand: vi.fn(),
    UploadPartCommand: vi.fn(),
    CompleteMultipartUploadCommand: vi.fn(),
    AbortMultipartUploadCommand: vi.fn(),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-presigned-url.com'),
}));

describe('Video & R2 Upload Logic', () => {
  let adminToken, course;

  beforeEach(async () => {
    vi.clearAllMocks();

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    const admin = await Admin.create({
      email: 'admin@test.com',
      password: hash
    });
    adminToken = jwt.sign({ role: 'admin', userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    course = await Course.create({ name: 'Video Course', status: 'active' });
  });

  it('should initiate multipart upload', async () => {
    const res = await request(app)
      .post(`/api/courses/${course._id}/videos/multipart-upload/initiate`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ filename: 'test-video.mp4', parts: 3 });
    
    expect(res.status).toBe(200);
    expect(res.body.uploadId).toBe('mock-upload-id');
    expect(res.body.objectKey).toContain('test-video.mp4');
    
    // S3 Mock verification
    expect(CreateMultipartUploadCommand).toHaveBeenCalled();
  });

  it('should abort multipart upload', async () => {
    const res = await request(app)
      .post(`/api/courses/${course._id}/videos/multipart-upload/abort`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ uploadId: 'mock-upload-id', objectKey: 'test-key.mp4' });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Multipart upload aborted successfully');
    
    expect(AbortMultipartUploadCommand).toHaveBeenCalledWith(expect.objectContaining({
      UploadId: 'mock-upload-id',
      Key: 'test-key.mp4'
    }));
  });

  it('should complete multipart upload and save Video in DB', async () => {
    const res = await request(app)
      .post(`/api/courses/${course._id}/videos/multipart-upload/complete`)
      .set('Cookie', [`admin_token=${adminToken}`])
      .send({ 
        uploadId: 'mock-upload-id', 
        objectKey: 'test-key.mp4',
        parts: [{ ETag: '123', PartNumber: 1 }],
        title: 'My Video',
        description: 'Test description',
        duration: 100,
        originalName: 'test.mp4',
        mimeType: 'video/mp4',
        size: 1024
      });
    
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('My Video');
    expect(res.body.objectKey).toBe('test-key.mp4');
    expect(CompleteMultipartUploadCommand).toHaveBeenCalled();
  });
});
