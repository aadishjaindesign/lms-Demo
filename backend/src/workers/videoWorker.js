import { Worker } from 'bullmq';
import { connection } from '../config/queue.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
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

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
console.log('[WORKER] ffmpeg path:', ffmpegInstaller.path);
console.log('[WORKER] ffprobe path:', ffprobeInstaller.path);
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const processVideoJob = async (job) => {
  const { videoId } = job.data;
  
  console.log(`[WORKER] JOB_STARTED for video ${videoId}`);
  const video = await Video.findById(videoId);
  if (!video || video.storageProvider !== 'r2' || !video.objectKey) {
    throw new Error(`Video not found or invalid storage provider for ${videoId}`);
  }

  let hlsPercent = 0;
  let compressPercent = 0;
  let lastReportedProgress = 0;
  let lastUpdateTime = 0;

  const updateProgress = async () => {
    const avgProgress = Math.min(99, Math.round((hlsPercent + compressPercent) / 2));
    const now = Date.now();
    if (avgProgress >= lastReportedProgress + 3 || (now - lastUpdateTime > 5000 && avgProgress !== lastReportedProgress)) {
      lastReportedProgress = avgProgress;
      lastUpdateTime = now;
      try {
        await Video.findByIdAndUpdate(videoId, { processingProgress: avgProgress });
      } catch (err) {
        console.error(`[WORKER] Failed to update progress to DB:`, err.message);
      }
    }
  };

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

    // 3. Get video metadata first to detect actual resolution
    console.log(`[WORKER] FFMPEG_STARTED`);

    // Detect source resolution (fail-safe — defaults to 720p if ffprobe errors)
    let sourceInfo = { width: 1280, height: 720 };
    try {
      sourceInfo = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputFilePath, (err, metadata) => {
          if (err) return reject(err);
          const vStream = metadata.streams.find(s => s.codec_type === 'video');
          resolve({ width: vStream?.width || 1280, height: vStream?.height || 720 });
        });
      });
      console.log(`[WORKER] Source resolution: ${sourceInfo.width}x${sourceInfo.height}`);
    } catch (probeErr) {
      console.warn(`[WORKER] ffprobe failed, defaulting to 720p: ${probeErr.message}`);
    }


    // Only include 720p if source is actually >= 720p
    const include720p = sourceInfo.height >= 720;

    // Detect CPU thread count for maximum throughput
    const threads = '2';
    console.log(`[WORKER] Using ${threads} CPU threads`);

    const hlsPromise = new Promise((resolve, reject) => {
      const cmd = ffmpeg(inputFilePath, { timeout: 432000 })
        .addOptions([
          `-threads ${threads}`,
          '-profile:v baseline',
          '-preset superfast',
          '-tune zerolatency',
          '-g 48',
          '-keyint_min 48',
          '-sc_threshold 0',
          '-async 1',           // Fix audio sync drift (critical for browser-compressed WebM)
          '-vsync 1',           // Fix variable frame rate (fixes truncated video issue)
        ])
        .output(path.join(tempDir, '360p.m3u8'))
        .outputOptions([
          `-threads ${threads}`,
          "-vf scale=-2:'if(gt(ih,360),360,ih)'",
          '-b:v 600k', '-maxrate 700k', '-bufsize 900k',
          '-c:a aac',           // Explicit AAC audio codec (fixes no audio issue)
          '-b:a 96k',           // Raised from 64k — ensures audio is clear
          '-ar 44100',          // Standard audio sample rate
          '-hls_time 4',
          '-hls_list_size 0',
          '-hls_playlist_type vod',
          '-hls_segment_filename', path.join(tempDir, '360p_%03d.ts'),
        ]);

      if (include720p) {
        cmd
          .output(path.join(tempDir, '720p.m3u8'))
          .outputOptions([
            `-threads ${threads}`,
            "-vf scale=-2:'if(gt(ih,720),720,ih)'",
            '-b:v 2000k', '-maxrate 2200k', '-bufsize 3000k',
            '-c:a aac',           // Explicit AAC audio codec
            '-b:a 128k',
            '-ar 44100',
            '-hls_time 4',
            '-hls_list_size 0',
            '-hls_playlist_type vod',
            '-hls_segment_filename', path.join(tempDir, '720p_%03d.ts'),
          ]);
      }

      cmd
        .on('progress', (progress) => {
          if (progress.percent) {
            hlsPercent = Math.max(hlsPercent, progress.percent);
            updateProgress();
            // console.log(`[WORKER] FFmpeg HLS progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('error', (err) => {
          console.error('[WORKER][ERROR] FFmpeg HLS error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('[WORKER] FFMPEG_HLS_COMPLETED');
          resolve();
        })
        .run();
    });

    const compressPromise = new Promise((resolve, reject) => {
      ffmpeg(inputFilePath, { timeout: 432000 })
        .outputOptions([
          `-threads ${threads}`,
          '-c:v libx264',
          '-preset veryfast',
          '-crf 28',
          '-maxrate 1500k',     // Enforce maximum bitrate to prevent huge sizes
          '-bufsize 3000k',     // Buffer size for maxrate
          "-vf scale=-2:'if(gt(ih,720),720,ih)'", // Scale to 720p (only if larger)
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart'
        ])
        .output(path.join(tempDir, 'compressed.mp4'))
        .on('progress', (progress) => {
          if (progress.percent) {
            compressPercent = Math.max(compressPercent, progress.percent);
            updateProgress();
            // console.log(`[WORKER] FFmpeg Compress progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('error', (err) => {
          console.error('[WORKER][ERROR] FFmpeg compression error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('[WORKER] FFMPEG_COMPRESSION_COMPLETED');
          resolve();
        })
        .run();
    });

    await Promise.all([hlsPromise, compressPromise]);


    const bandwidth720 = '2000000';
    const masterPlaylistContent = include720p
      ? `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=640x360\n360p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth720},RESOLUTION=1280x720\n720p.m3u8`
      : `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=640x360\n360p.m3u8`;
    fs.writeFileSync(path.join(tempDir, 'master.m3u8'), masterPlaylistContent);
    console.log(`[WORKER] HLS_GENERATION_COMPLETED (720p: ${include720p})`);


    // 4. Upload all HLS files to R2
    console.log(`[WORKER] HLS_UPLOAD_STARTED`);
    const files = fs.readdirSync(tempDir);
    const hlsBaseKey = `videos/${video.courseId}/${video._id}/hls`;
    
    const hlsFiles = files.filter(file => file !== 'input.mp4' && file !== 'compressed.mp4');
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

    // 4b. Upload compressed MP4 to replace original video
    console.log(`[WORKER] COMPRESSED_MP4_UPLOAD_STARTED`);
    const compressedMp4Path = path.join(tempDir, 'compressed.mp4');
    if (fs.existsSync(compressedMp4Path)) {
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: video.objectKey,
        Body: fs.createReadStream(compressedMp4Path), // Using stream to save RAM
        ContentType: 'video/mp4',
      });
      await r2Client.send(uploadCommand);
      console.log(`[WORKER] COMPRESSED_MP4_UPLOAD_COMPLETED`);
      
      // Update the video size in DB (getting stat of compressed file)
      const stats = fs.statSync(compressedMp4Path);
      video.size = stats.size;
    }

    // 5. Cleanup local temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 6. Update Video status in DB
    console.log(`[WORKER] DB_UPDATE_STARTED`);
    await Video.findByIdAndUpdate(
      videoId,
      {
        hlsReady: true,
        processingStatus: 'ready',
        processingProgress: 100,
        hlsMasterPlaylist: `${hlsBaseKey}/master.m3u8`,
        size: video.size // updated compressed size
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
