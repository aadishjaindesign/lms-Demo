import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Video from './src/models/Video.js';
import connectToDatabase from './src/config/database.js';

dotenv.config();

const run = async () => {
  await connectToDatabase();
  const videos = await Video.find({ storageProvider: 'r2' }).lean();
  console.log(videos);
  process.exit(0);
};
run();
