import mongoose from "mongoose";
import dotenv from "dotenv";
import Video from "./src/models/Video.js";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const video = await Video.findOne({ title: "qwerg" });
    if (video) {
      console.log(`${video.title} | hlsReady: ${video.hlsReady} | processingStatus: ${video.processingStatus}`);
    } else {
      console.log("Video 'qwerg' not found");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
