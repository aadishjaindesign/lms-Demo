import mongoose from "mongoose";
import jwt from "jsonwebtoken";
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
  if (!video) { console.log("No video"); process.exit(1); }

  const url = `http://localhost:5000/api/courses/${video.courseId}/videos/${video._id}/hls/master.m3u8`;
  console.log("Fetching:", url);

  const res = await fetch(url, { headers: { "Cookie": `admin_token=${token}` } });
  const text = await res.text();
  console.log("=== MASTER PLAYLIST ===");
  console.log(text);
  
  // also fetch a variant
  const variantMatch = text.match(/(\/api\/courses\/.*\.m3u8)/);
  if (variantMatch) {
      const vUrl = `http://localhost:5000${variantMatch[1]}`;
      console.log("Fetching variant:", vUrl);
      const vRes = await fetch(vUrl, { headers: { "Cookie": `admin_token=${token}` } });
      const vText = await vRes.text();
      console.log("=== VARIANT PLAYLIST EXCERPT ===");
      console.log(vText.split('\n').slice(0, 10).join('\n'));
  }

  process.exit(0);
}
run();
