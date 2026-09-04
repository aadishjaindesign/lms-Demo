import mongoose from "mongoose";
import dotenv from "dotenv";
import Video from "./src/models/Video.js";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to DB. Deleting all videos...");
    const result = await Video.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} videos from the database.`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error connecting to DB:", err);
    process.exit(1);
  });
