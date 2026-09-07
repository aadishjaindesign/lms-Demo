import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Suppress dotenv output by muting stdout temporarily or using quiet option if supported
// Wait, we can just strip the URL!
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const students = mongoose.connection.collection('students');
  const user = await students.findOne({});
  const token = jwt.sign(
    { userId: user._id.toString(), role: 'admin' },
    process.env.JWT_SECRET || 'default_jwt_secret',
    { expiresIn: '1d' }
  );
  
  const videos = mongoose.connection.collection("videos");
  const video = await videos.findOne({ hlsReady: true });
  
  const masterUrl = `http://localhost:5000/api/courses/${video.courseId}/videos/${video._id}/hls/master.m3u8`;
  const mRes = await fetch(masterUrl, { headers: { "Cookie": `admin_token=${token}` } });
  const mText = await mRes.text();
  
  const variantMatch = mText.match(/(\/api\/courses\/.*\.m3u8)/);
  const variantUrl = `http://localhost:5000${variantMatch[1]}`;
  const vRes = await fetch(variantUrl, { headers: { "Cookie": `admin_token=${token}` } });
  const vText = await vRes.text();
  
  const segmentMatch = vText.match(/(https:\/\/.*\.ts\?.*)/);
  if (segmentMatch) {
     // Output to a file instead to avoid stdout contamination
     import("fs").then(fs => fs.writeFileSync("segment_url.txt", segmentMatch[1]));
  }
  process.exit(0);
}
run();
