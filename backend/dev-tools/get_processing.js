import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const videos = mongoose.connection.collection("videos");
  const stuck = await videos.find({ processingStatus: "processing" }).toArray();
  for (let v of stuck) {
     console.log(JSON.stringify(v, null, 2));
  }
  process.exit(0);
}
run();
