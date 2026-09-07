import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import Video from './src/models/Video.js';
import { queueVideoForProcessing } from './src/services/videoProcessingService.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find all videos with storageProvider: 'r2' and hlsReady != true
  const videos = await Video.find({ storageProvider: 'r2', hlsReady: { $ne: true } });
  
  for (const video of videos) {
     console.log("Fixing video:", video._id, video.title);
     video.processingStatus = 'processing';
     await video.save();
     
     // Queue for processing
     // queueVideoForProcessing(video._id); 
     // (We won't call this directly because it requires S3/ffmpeg to be properly initialized in the main process)
  }
  
  console.log("Updated", videos.length, "videos. They will be picked up on next server restart.");
  mongoose.disconnect();
}
test();
