import mongoose from "mongoose";
import dotenv from "dotenv";
import { S3Client, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("[DB] Connected");

  const Video = mongoose.connection.collection("videos");
  
  // Find recent videos or the "web-bb" video (might just be a title)
  const video = await Video.findOne({ title: { $regex: "web", $options: "i" } }) || await Video.findOne({}, { sort: { createdAt: -1 } });
  
  if (!video) {
    console.log("No videos found.");
    process.exit(0);
  }

  console.log("=== DB RECORD ===");
  console.log(JSON.stringify(video, null, 2));

  console.log("\n=== R2 ORIGINAL VIDEO ===");
  if (video.storageProvider === "r2" && video.objectKey) {
    try {
      const headCmd = new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: video.objectKey });
      const head = await r2Client.send(headCmd);
      console.log(`Original exists: YES. Size: ${head.ContentLength} bytes. ContentType: ${head.ContentType}`);
    } catch (e) {
      console.log(`Original exists: NO. Error: ${e.message}`);
    }
  }

  console.log("\n=== R2 HLS FILES ===");
  if (video.storageProvider === "r2") {
    try {
      const prefix = `videos/${video.courseId}/${video._id}/hls`;
      const listCmd = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: prefix });
      const list = await r2Client.send(listCmd);
      if (list.Contents && list.Contents.length > 0) {
        console.log(`Found ${list.Contents.length} HLS related objects.`);
        const master = list.Contents.find(o => o.Key.endsWith('master.m3u8'));
        console.log(`Master playlist exists: ${master ? 'YES' : 'NO'}`);
      } else {
        console.log("No HLS objects found with prefix: " + prefix);
      }
    } catch (e) {
      console.log("Error listing HLS files:", e.message);
    }
  }

  process.exit(0);
}

runAudit().catch(console.error);
