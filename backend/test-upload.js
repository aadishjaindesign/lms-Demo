import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import Video from "./src/models/Video.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const video = new Video({
      courseId: new mongoose.Types.ObjectId(),
      title: "Test Video",
      objectKey: "test-key",
      originalName: "test.mp4",
      mimeType: "video/mp4",
      size: 1000,
      expiresAt: new Date(),
      uploadedAt: new Date(),
      order: 1,
      processingStatus: "processing",
      storageProvider: "r2"
    });
    await video.save();
    console.log("Success");
  } catch(e) {
    console.error("Save error:", e);
  }
  process.exit();
}
run();
