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
  const tsKey = "videos/6a966ad560c263386f9ed691/6a9b9fb0fd5507981243c5b4/hls/360p_000.ts";
  try {
    await r2Client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: tsKey }));
    console.log(`[Segment] EXISTS: ${tsKey}`);
  } catch(e) {
    console.log(`[Segment] MISSING: ${tsKey} -> ${e.message}`);
  }
}
run();
