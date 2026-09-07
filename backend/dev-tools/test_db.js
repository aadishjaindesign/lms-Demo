import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const videos = await db.collection('videos').find({}).sort({_id: -1}).limit(2).toArray();
  console.log(JSON.stringify(videos, null, 2));
  mongoose.disconnect();
}
test();
