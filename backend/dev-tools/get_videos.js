import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const videos = mongoose.connection.collection("videos");
  const allVideos = await videos.find({ courseId: new mongoose.Types.ObjectId("6a993a2447b54817ae7f96ad") }).toArray();
  for (let v of allVideos) {
     console.log(`Video: ${v.title}, ID: ${v._id}, hlsReady: ${v.hlsReady}, storageProvider: ${v.storageProvider}`);
  }
  process.exit(0);
}
run();
