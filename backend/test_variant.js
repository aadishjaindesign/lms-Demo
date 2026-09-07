import dotenv from "dotenv";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

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

async function runTest() {
  const keys = [
    "videos/6a966ad560c263386f9ed691/6a9b9fb0fd5507981243c5b4/hls/360p.m3u8",
    "videos/6a966ad560c263386f9ed691/6a9b9fb0fd5507981243c5b4/hls/480p.m3u8",
    "videos/6a966ad560c263386f9ed691/6a9b9fb0fd5507981243c5b4/hls/720p.m3u8"
  ];

  for (const key of keys) {
    try {
      await r2Client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
      console.log(`[Variant] EXISTS: ${key}`);
    } catch(e) {
      console.log(`[Variant] MISSING: ${key} -> ${e.message}`);
    }
  }
}
runTest().catch(console.error);
