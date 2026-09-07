import fs from 'fs';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from './src/config/r2.js';
import mongoose from 'mongoose';
import Video from './src/models/Video.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  // Find a video that failed processing
  const video = await Video.findOne({ processingStatus: 'processing' });
  if (!video) {
    console.log("No processing video found.");
    process.exit(0);
  }

  console.log(`Testing download for video ${video._id}, objectKey: ${video.objectKey}`);
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: video.objectKey,
  });

  const response = await r2Client.send(command);
  
  const inputFilePath = `test_download_${video._id}.mp4`;
  const fileStream = fs.createWriteStream(inputFilePath);

  console.log("Download started...");
  response.Body.pipe(fileStream);

  await new Promise((resolve, reject) => {
    response.Body.on('end', () => {
      console.log("Body end emitted.");
    });
    response.Body.on('error', (err) => {
      console.error("Body error:", err);
      reject(err);
    });
    fileStream.on('finish', () => {
      console.log("FileStream finish emitted. Download complete!");
      resolve();
    });
    fileStream.on('error', (err) => {
      console.error("FileStream error:", err);
      reject(err);
    });
  });

  console.log(`File size: ${fs.statSync(inputFilePath).size} bytes`);
  fs.unlinkSync(inputFilePath);
  process.exit(0);
}
run();
