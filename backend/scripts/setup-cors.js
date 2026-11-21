import "../src/config/env.js";
import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { r2Client } from "../src/config/r2.js";

console.log("R2 configuration:");
console.log(`Bucket: ${process.env.R2_BUCKET_NAME}`);
console.log(`Endpoint: ${process.env.R2_ENDPOINT}`);
console.log(`Region: auto`);

const corsCommand = new PutBucketCorsCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  CORSConfiguration: {
    CORSRules: [
      // Public HLS segments / MP4 reads: any site may GET (no credentials involved)
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "HEAD"],
        AllowedOrigins: ["*"],
        ExposeHeaders: ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
        MaxAgeSeconds: 86400,
      },
      // Direct browser uploads (presigned PUT) only from our own sites
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "PUT", "HEAD", "DELETE"],
        AllowedOrigins: [
          "http://localhost:3000",
          "https://lms-demo-mauve.vercel.app",
          "https://lms.jainscomputer.com",
          "https://student.jainscomputer.com",
          "https://admin.jainscomputer.com",
          "https://kreach.in",
          "https://www.kreach.in",
        ],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
  },
});

async function run() {
  try {
    console.log(`Setting CORS for bucket: ${process.env.R2_BUCKET_NAME}`);
    await r2Client.send(corsCommand);
    console.log("Successfully configured CORS on R2 bucket.");
  } catch (err) {
    console.error("Error configuring CORS:", err);
  }
}

run();
