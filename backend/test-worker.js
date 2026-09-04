import dotenv from 'dotenv';
import connectToDatabase from './src/config/database.js';
import { resumePendingVideos, videoQueue } from './src/services/videoProcessingService.js';

dotenv.config();

const run = async () => {
  await connectToDatabase();
  console.log('Starting test worker...');
  
  videoQueue.drain = () => {
    console.log('All queue items have been processed.');
    process.exit(0);
  };
  
  await resumePendingVideos();
  
  if (videoQueue.length() === 0 && videoQueue.running() === 0) {
    console.log('No items in queue.');
    process.exit(0);
  }
};

run();
