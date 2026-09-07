import mongoose from "mongoose";
import fs from "fs";
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

  const courseId = "6a993a2447b54817ae7f96ad"; // known course ID
  const filePath = "test_video_16.mp4";
  const fileStats = fs.statSync(filePath);
  const fileSize = fileStats.size;
  const chunkSize = 5 * 1024 * 1024;
  const partsCount = Math.ceil(fileSize / chunkSize);

  console.log(`Starting upload for ${fileSize} bytes in ${partsCount} parts`);

  const initRes = await fetch(`http://localhost:5000/api/courses/${courseId}/videos/multipart-upload/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": `admin_token=${token}` },
    body: JSON.stringify({ filename: "test_video_16.mp4", parts: partsCount })
  });
  const initData = await initRes.json();
  const { uploadId, objectKey, presignedUrls } = initData;
  const parts = [];

  const fileBuffer = fs.readFileSync(filePath);

  for (let i = 0; i < presignedUrls.length; i++) {
    const { partNumber, url } = presignedUrls[i];
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    const chunk = fileBuffer.slice(start, end);
    const partRes = await fetch(url, { method: "PUT", body: chunk });
    const etag = partRes.headers.get("etag") || partRes.headers.get("ETag");
    parts.push({ PartNumber: partNumber, ETag: etag });
  }

  const completeRes = await fetch(`http://localhost:5000/api/courses/${courseId}/videos/multipart-upload/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": `admin_token=${token}` },
    body: JSON.stringify({
      uploadId, objectKey, parts, title: "Test Video 16MB",
      description: "Testing pipeline", size: fileSize,
      mimeType: "video/mp4", originalName: "test_video_16.mp4"
    })
  });
  
  const completeData = await completeRes.json();
  console.log("Complete response:", completeData);
  mongoose.disconnect();
  process.exit(0);
}
run();
