import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import Video from './src/models/Video.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const v = new Video({
    courseId: new mongoose.Types.ObjectId(),
    title: "Test Schema Save",
    storageProvider: "r2",
    processingStatus: "processing"
  });
  await v.save();
  const db = mongoose.connection.db;
  const raw = await db.collection('videos').findOne({ _id: v._id });
  console.log("Raw from DB:", raw);
  await Video.findByIdAndDelete(v._id);
  mongoose.disconnect();
}
test();
