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
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
        AllowedOrigins: ["http://localhost:3000", process.env.FRONTEND_URL || "https://your-production-url.com"], 
        ExposeHeaders: ["ETag", "Content-Length"],
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
