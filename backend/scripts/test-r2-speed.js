import "../src/config/env.js";
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { r2Client } from "../src/config/r2.js";
import crypto from "crypto";

async function runTest(targetSizeMB, partSizeMB, concurrency, buffer) {
  const targetSizeBytes = Math.floor(targetSizeMB * 1024 * 1024);
  const partSizeBytes = partSizeMB * 1024 * 1024;
  const numParts = Math.ceil(targetSizeBytes / partSizeBytes);
  
  const objectKey = `diagnostic-test-${concurrency}-${partSizeMB}-${Date.now()}.bin`;
  let uploadId;
  
  try {
    const initCmd = new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });
    const initRes = await r2Client.send(initCmd);
    uploadId = initRes.UploadId;
    
    const startTime = Date.now();
    let uploadedBytes = 0;
    
    const partsToUpload = Array.from({ length: numParts }).map((_, i) => i + 1);
    const uploadedParts = [];
    let currentIndex = 0;
    
    const uploadWorker = async () => {
      while (currentIndex < partsToUpload.length) {
        const partNumber = partsToUpload[currentIndex++];
        const start = (partNumber - 1) * partSizeBytes;
        const end = Math.min(start + partSizeBytes, targetSizeBytes);
        const chunk = buffer.subarray(start, end);
        
        const uploadCmd = new UploadPartCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: chunk,
        });
        
        const res = await r2Client.send(uploadCmd);
        
        uploadedBytes += chunk.length;
        uploadedParts.push({ ETag: res.ETag, PartNumber: partNumber });
      }
    };
    
    const workers = [];
    for (let i = 0; i < concurrency; i++) workers.push(uploadWorker());
    
    await Promise.all(workers);
    
    const totalTimeSec = (Date.now() - startTime) / 1000;
    const avgSpeedMBps = targetSizeMB / totalTimeSec;
    const avgSpeedMbps = avgSpeedMBps * 8;
    
    await r2Client.send(new AbortMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      UploadId: uploadId
    }));

    return { totalTimeSec, avgSpeedMBps, avgSpeedMbps };
  } catch (err) {
    if (uploadId) {
      await r2Client.send(new AbortMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: objectKey,
        UploadId: uploadId
      }));
    }
    throw err;
  }
}

async function main() {
  console.log("Starting R2 raw upload performance diagnostic tests...\n");
  
  const testSizeMB = 25; // Smaller size for rapid iteration
  console.log(`Generating ${testSizeMB} MB of random data in memory...`);
  const buffer = crypto.randomBytes(Math.floor(testSizeMB * 1024 * 1024));
  
  const scenarios = [
    { partSizeMB: 5, concurrency: 2 },
    { partSizeMB: 5, concurrency: 4 },
    { partSizeMB: 5, concurrency: 6 },
    { partSizeMB: 5, concurrency: 8 },
    { partSizeMB: 5, concurrency: 16 },
    { partSizeMB: 10, concurrency: 6 },
    { partSizeMB: 25, concurrency: 6 },
  ];
  
  for (const s of scenarios) {
    console.log(`Testing -> Part Size: ${s.partSizeMB}MB | Concurrency: ${s.concurrency}`);
    const { totalTimeSec, avgSpeedMBps, avgSpeedMbps } = await runTest(testSizeMB, s.partSizeMB, s.concurrency, buffer);
    console.log(`  Result: ${avgSpeedMBps.toFixed(2)} MB/s (${avgSpeedMbps.toFixed(2)} Mbps) in ${totalTimeSec.toFixed(2)}s\n`);
  }
}

main();
