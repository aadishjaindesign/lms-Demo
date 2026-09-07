import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function setCors() {
  const command = new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag", "Content-Length", "Accept-Ranges"],
          MaxAgeSeconds: 3600,
        }
      ]
    }
  });

  try {
    await s3.send(command);
    console.log("CORS configuration successfully applied to bucket:", process.env.R2_BUCKET_NAME);
  } catch (err) {
    console.error("Error setting CORS:", err);
  }
}
setCors();
