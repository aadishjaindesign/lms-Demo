import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables if not already loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by bullmq
};

// Create a singleton Redis connection for the queue and worker
export const connection = new Redis(redisOptions);

connection.on('error', (err) => {
  console.error('[REDIS ERROR] Failed to connect to Redis:', err.message);
});

connection.on('connect', () => {
  console.log('[REDIS] Connected to Redis successfully');
});

// Create and export the BullMQ Queue
export const videoQueue = new Queue('video-processing', { connection });
