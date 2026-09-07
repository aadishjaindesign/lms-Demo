import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
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
async function run() {
  const key = "videos/6a993a2447b54817ae7f96ad/661627c6-bbfa-419f-bf1f-5c1c37b7c9ed-final_video_ai__1_.mp4";
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
    console.log(`[MP4] EXISTS: ${key}`);
  } catch(e) {
    console.log(`[MP4] MISSING/ERROR: ${key} -> ${e.message}`);
  }
}
run();
