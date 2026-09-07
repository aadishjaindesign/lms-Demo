import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const videos = mongoose.connection.collection("videos");
  const allVideos = await videos.find({}).toArray();
  for (let v of allVideos) {
     console.log(`Video: ${v.title}, ID: ${v._id}, Course: ${v.courseId}, status: ${v.status}`);
  }
  process.exit(0);
}
run();
