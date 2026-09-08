import { Worker } from 'bullmq';
import { connection } from '../config/queue.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '../config/r2.js';
import Video from '../models/Video.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Connect to MongoDB if not connected (necessary since worker runs independently)
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[WORKER] Connected to MongoDB'))
    .catch(err => console.error('[WORKER ERROR] MongoDB connection failed:', err));
}

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const processVideoJob = async (job) => {
  const { videoId } = job.data;
  
  console.log(`[WORKER] JOB_STARTED for video ${videoId}`);
  const video = await Video.findById(videoId);
  if (!video || video.storageProvider !== 'r2' || !video.objectKey) {
    throw new Error(`Video not found or invalid storage provider for ${videoId}`);
  }

  // 1. Prepare temporary directory
  const tempDir = path.join(os.tmpdir(), `hls_${videoId}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // 2. Download the video locally via native AWS SDK Stream
    console.log(`[WORKER] SOURCE_DOWNLOAD_STARTED`);
    const inputFilePath = path.join(tempDir, 'input.mp4');
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: video.objectKey,
    });
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`[WORKER][ERROR] Download timed out for video ${videoId}`);
      abortController.abort(new Error('Download timeout after 60 minutes'));
    }, 60 * 60 * 1000); // 60 minutes timeout
    
    const response = await r2Client.send(command, { abortSignal: abortController.signal });
    
    let downloadedBytes = 0;
    response.Body.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (downloadedBytes % (5 * 1024 * 1024) < chunk.length) {
        console.log(`[WORKER] Downloaded ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB`);
      }
    });

    const fileStream = fs.createWriteStream(inputFilePath);
    
    try {
      await pipeline(response.Body, fileStream, { signal: abortController.signal });
    } catch (downloadErr) {
      console.error(`[WORKER][ERROR] Pipeline failed during download:`, downloadErr.message);
      throw downloadErr;
    } finally {
      clearTimeout(timeoutId);
    }
    console.log(`[WORKER] SOURCE_DOWNLOAD_COMPLETED`);

    // 3. Setup HLS variants based on local file
    console.log(`[WORKER] FFMPEG_STARTED`);
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputFilePath, { timeout: 432000 })
        .addOptions([
          '-threads 4',
          '-profile:v main',
          '-preset ultrafast',
          '-tune fastdecode',
          '-g 48',
          '-keyint_min 48',
          '-sc_threshold 0',
          '-hls_time 6',
          '-hls_list_size 0',
          '-hls_playlist_type vod',
        ])
        .output(path.join(tempDir, '360p.m3u8'))
        .outputOptions(['-vf scale=-2:360', '-b:v 800k', '-maxrate 856k', '-bufsize 1200k', '-b:a 96k', '-hls_segment_filename', path.join(tempDir, '360p_%03d.ts')])
        .output(path.join(tempDir, '480p.m3u8'))
        .outputOptions(['-vf scale=-2:480', '-b:v 1400k', '-maxrate 1498k', '-bufsize 2100k', '-b:a 128k', '-hls_segment_filename', path.join(tempDir, '480p_%03d.ts')])
        .output(path.join(tempDir, '720p.m3u8'))
        .outputOptions(['-vf scale=-2:720', '-b:v 2800k', '-maxrate 2996k', '-bufsize 4200k', '-b:a 128k', '-hls_segment_filename', path.join(tempDir, '720p_%03d.ts')])
        .on('error', (err) => {
          console.error('[WORKER][ERROR] FFmpeg error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('[WORKER] FFMPEG_COMPLETED');
          resolve();
        })
        .run();
    });

    const masterPlaylistContent = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\n360p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480\n480p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720\n720p.m3u8`;
    fs.writeFileSync(path.join(tempDir, 'master.m3u8'), masterPlaylistContent);
    console.log('[WORKER] HLS_GENERATION_COMPLETED');

    // 4. Upload all HLS files to R2
    console.log(`[WORKER] HLS_UPLOAD_STARTED`);
    const files = fs.readdirSync(tempDir);
    const hlsBaseKey = `videos/${video.courseId}/${video._id}/hls`;
    
    const hlsFiles = files.filter(file => file !== 'input.mp4');
    const CONCURRENCY_LIMIT = 15;
    
    for (let i = 0; i < hlsFiles.length; i += CONCURRENCY_LIMIT) {
      const batch = hlsFiles.slice(i, i + CONCURRENCY_LIMIT);
      const uploadPromises = batch.map(file => {
        const filePath = path.join(tempDir, file);
        const fileContent = fs.readFileSync(filePath);
        let contentType = 'video/MP2T';
        if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
        
        const uploadCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `${hlsBaseKey}/${file}`,
          Body: fileContent,
          ContentType: contentType,
        });
        return r2Client.send(uploadCommand);
      });
      await Promise.all(uploadPromises);
      console.log(`[WORKER] Uploaded batch ${Math.floor(i/CONCURRENCY_LIMIT) + 1} of ${Math.ceil(hlsFiles.length/CONCURRENCY_LIMIT)}`);
    }
    console.log(`[WORKER] HLS_UPLOAD_COMPLETED`);

    // 5. Cleanup local temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 6. Update Video status in DB
    console.log(`[WORKER] DB_UPDATE_STARTED`);
    await Video.findByIdAndUpdate(
      videoId,
      {
        hlsReady: true,
        processingStatus: 'ready',
        hlsMasterPlaylist: `${hlsBaseKey}/master.m3u8`
      },
      { new: true, upsert: false }
    );
    console.log(`[WORKER] PROCESSING_COMPLETED for video ${videoId}`);

  } catch (error) {
    console.error(`[WORKER][ERROR] Processing failed for video ${videoId}:`, error.message);
    
    try {
      await Video.findByIdAndUpdate(videoId, { processingStatus: 'failed' });
    } catch (dbErr) {
      console.error(`[WORKER][ERROR] Failed to update video status to failed:`, dbErr.message);
    }
    
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[WORKER] Cleanup completed after error`);
      } catch (cleanupErr) {
        console.error(`[WORKER][ERROR] Cleanup failed:`, cleanupErr.message);
      }
    }
    
    throw error; // Rethrow to let BullMQ know the job failed
  }
};

// Create the BullMQ Worker
const worker = new Worker('video-processing', processVideoJob, { 
  connection,
  concurrency: 1 // Keep concurrency 1 per worker instance to not overwhelm system
});

worker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed successfully!`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job.id} failed with error: ${err.message}`);
});

worker.on('error', err => {
  console.error('[WORKER ERROR] Worker hit a global error:', err);
});

console.log('[WORKER] Video processing worker started and listening for jobs...');
