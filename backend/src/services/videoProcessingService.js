import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';
import https from 'https';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '../config/r2.js';
import Video from '../models/Video.js';
import fastq from 'fastq';

// Set ffmpeg path from the statically compiled binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Worker function for the queue
const processVideoWorker = async (job, done) => {
  const { videoId } = job;
  try {
    console.log(`[PROCESS] WORKER_STARTED for video ${videoId}`);
    const video = await Video.findById(videoId);
    if (!video || video.storageProvider !== 'r2' || !video.objectKey) {
      throw new Error(`Video not found or invalid storage provider for ${videoId}`);
    }

    console.log(`[PROCESS] JOB_RECEIVED for video ${videoId}`);

    // 1. Prepare temporary directory
    const tempDir = path.join(os.tmpdir(), `hls_${videoId}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 2. Download the video locally via native AWS SDK Stream
    console.log(`[PROCESS] SOURCE_DOWNLOAD_STARTED`);
    const inputFilePath = path.join(tempDir, 'input.mp4');
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: video.objectKey,
    });
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`[PROCESS][ERROR] Download timed out for video ${videoId}`);
      abortController.abort(new Error('Download timeout after 5 minutes'));
    }, 5 * 60 * 1000); // 5 minutes timeout
    
    const response = await r2Client.send(command, { abortSignal: abortController.signal });
    
    let downloadedBytes = 0;
    response.Body.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      // Log progress roughly every 5MB to avoid console spam
      if (downloadedBytes % (5 * 1024 * 1024) < chunk.length) {
        console.log(`[PROCESS] Downloaded ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB`);
      }
    });

    const fileStream = fs.createWriteStream(inputFilePath);
    
    try {
      await pipeline(response.Body, fileStream, { signal: abortController.signal });
    } catch (downloadErr) {
      console.error(`[PROCESS][ERROR] Pipeline failed during download:`, downloadErr.message);
      throw downloadErr; // Will be caught by the outer try-catch for DB update and cleanup
    } finally {
      clearTimeout(timeoutId);
    }
    
    console.log(`[PROCESS] SOURCE_DOWNLOAD_COMPLETED`);

    // 3. Setup HLS variants based on local file
    console.log(`[PROCESS] FFMPEG_STARTED`);
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputFilePath, { timeout: 432000 })
        .addOptions([
          '-threads 4',                // Use 4 threads for parallel processing
          '-profile:v main',
          '-preset ultrafast',         // Maximum speed preset
          '-tune fastdecode',          // Fast decoding optimization
          '-g 48',
          '-sc_threshold 0',
          '-hls_time 6',
          '-hls_playlist_type vod',
        ])
        
        // 360p
        .output(path.join(tempDir, '360p.m3u8'))
        .outputOptions([
          '-vf scale=-2:360',
          '-b:v 800k',
          '-maxrate 856k',
          '-bufsize 1200k',
          '-b:a 96k',
          '-hls_segment_filename', path.join(tempDir, '360p_%03d.ts')
        ])
        
        // 480p
        .output(path.join(tempDir, '480p.m3u8'))
        .outputOptions([
          '-vf scale=-2:480',
          '-b:v 1400k',
          '-maxrate 1498k',
          '-bufsize 2100k',
          '-b:a 128k',
          '-hls_segment_filename', path.join(tempDir, '480p_%03d.ts')
        ])

        // 720p
        .output(path.join(tempDir, '720p.m3u8'))
        .outputOptions([
          '-vf scale=-2:720',
          '-b:v 2800k',
          '-maxrate 2996k',
          '-bufsize 4200k',
          '-b:a 128k',
          '-hls_segment_filename', path.join(tempDir, '720p_%03d.ts')
        ])
        
        .on('error', (err) => {
          console.error('[PROCESS][ERROR] FFmpeg error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('[PROCESS] FFMPEG_COMPLETED');
          resolve();
        })
        .run();
    });

    // Generate Master Playlist
    const masterPlaylistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8`;

    fs.writeFileSync(path.join(tempDir, 'master.m3u8'), masterPlaylistContent);
    console.log('[PROCESS] HLS_GENERATION_COMPLETED');

    // 4. Upload all HLS files to R2
    console.log(`[PROCESS] HLS_UPLOAD_STARTED`);
    const files = fs.readdirSync(tempDir);
    const hlsBaseKey = `videos/${video.courseId}/${video._id}/hls`;
    
    const uploadPromises = [];
    for (const file of files) {
      if (file === 'input.mp4') continue; // Skip the original local file
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
      uploadPromises.push(r2Client.send(uploadCommand));
    }
    
    await Promise.all(uploadPromises);
    console.log(`[PROCESS] HLS_UPLOAD_COMPLETED`);

    // 5. Cleanup local temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 6. Update Video status in DB
    console.log(`[PROCESS] DB_UPDATE_STARTED`);
    await Video.findByIdAndUpdate(
      videoId,
      {
        hlsReady: true,
        processingStatus: 'ready',
        hlsMasterPlaylist: `${hlsBaseKey}/master.m3u8`
      },
      { new: true, upsert: false }
    );
    console.log(`[PROCESS] DB_UPDATE_COMPLETED`);
    console.log(`[PROCESS] PROCESSING_COMPLETED`);
    done(null);
  } catch (error) {
    console.error(`[PROCESS][ERROR] Processing failed:`, error.message);
    try {
      await Video.findByIdAndUpdate(videoId, { processingStatus: 'failed' });
    } catch (dbErr) {
      console.error(`[PROCESS][ERROR] Failed to update video status:`, dbErr.message);
    }
    
    // Cleanup on error
    const tempDir = path.join(os.tmpdir(), `hls_${videoId}`);
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[PROCESS] Cleanup completed after error`);
      } catch (cleanupErr) {
        console.error(`[PROCESS][ERROR] Cleanup failed:`, cleanupErr.message);
      }
    }
    
    done(error);
  }
};

// Create a queue with concurrency 1 to avoid crashing Render
export const videoQueue = fastq(processVideoWorker, 1);

export const queueVideoForProcessing = (videoId) => {
  console.log(`[PROCESS] JOB_CREATED for video ${videoId}`);
  videoQueue.push({ videoId }, (err) => {
    if (err) {
      console.error(`[PROCESS][ERROR] Queue push failed:`, err.message);
    }
  });
};

export const resumePendingVideos = async () => {
  try {
    const pendingVideos = await Video.find({ processingStatus: 'processing' });
    for (const video of pendingVideos) {
      console.log(`[HLS] Resuming processing for video ${video._id}`);
      queueVideoForProcessing(video._id);
    }
  } catch (error) {
    console.error('[HLS ERROR] Error resuming pending videos:', error);
  }
};
