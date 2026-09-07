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

  console.log("Measuring Master Playlist...");
  const masterUrl = `http://localhost:5000/api/courses/${video.courseId}/videos/${video._id}/hls/master.m3u8`;
  
  const t0 = performance.now();
  const mRes = await fetch(masterUrl, { headers: { "Cookie": `admin_token=${token}` } });
  const mText = await mRes.text();
  const t1 = performance.now();
  console.log(`Master loaded in ${(t1-t0).toFixed(2)}ms, size: ${mText.length} bytes`);

  const variantMatch = mText.match(/(\/api\/courses\/.*\.m3u8)/);
  if (!variantMatch) { console.log("No variant found"); process.exit(1); }

  const variantUrl = `http://localhost:5000${variantMatch[1]}`;
  console.log(`Measuring Variant Playlist...`);
  const t2 = performance.now();
  const vRes = await fetch(variantUrl, { headers: { "Cookie": `admin_token=${token}` } });
  const vText = await vRes.text();
  const t3 = performance.now();
  console.log(`Variant loaded in ${(t3-t2).toFixed(2)}ms, size: ${vText.length} bytes`);

  const segmentMatch = vText.match(/(https:\/\/.*\.ts\?.*)/);
  if (segmentMatch) {
     const segmentUrl = segmentMatch[1];
     console.log(`Measuring First Segment...`);
     const t4 = performance.now();
     const sRes = await fetch(segmentUrl);
     const sBuffer = await sRes.arrayBuffer();
     const t5 = performance.now();
     console.log(`Segment loaded in ${(t5-t4).toFixed(2)}ms, size: ${sBuffer.byteLength} bytes`);
  } else {
     console.log("No segment found via R2 URL format.");
  }

  process.exit(0);
}
run();
