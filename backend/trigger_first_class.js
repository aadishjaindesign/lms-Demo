import mongoose from "mongoose";
import dotenv from "dotenv";
import Video from "./src/models/Video.js";
import { queueVideoForProcessing } from "./src/services/videoProcessingService.js";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const video = await Video.findOne({ title: "First class" });
    if (video) {
      console.log(`Queueing ${video.title} for HLS processing...`);
      video.processingStatus = "processing";
      await video.save();
      queueVideoForProcessing(video._id);
      console.log("Queued successfully.");
    } else {
      console.log("Video not found.");
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
