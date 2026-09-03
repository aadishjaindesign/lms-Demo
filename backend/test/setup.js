import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Set test environment variables
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.R2_BUCKET_NAME = 'test_bucket';
  process.env.CLOUDINARY_API_KEY = 'test_cloudinary_key';
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';

  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});
