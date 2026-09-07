import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const videos = mongoose.connection.collection("videos");
  const video = await videos.findOne({ title: "web-bb" });
  console.log(video);
  process.exit(0);
}
run();
