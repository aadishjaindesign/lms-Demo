import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
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
    console.log(`[HLS] Job started for video ${videoId}`);
    const video = await Video.findById(videoId);
    if (!video || video.storageProvider !== 'r2' || !video.objectKey) {
      throw new Error(`Video not found or invalid storage provider for ${videoId}`);
    }

    // 1. Generate Presigned URL for the input video
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: video.objectKey,
    });
    // Give it 6 hours to download/stream
    const inputUrl = await getSignedUrl(r2Client, command, { expiresIn: 6 * 3600 });

    // 2. Prepare temporary directory
    const tempDir = path.join(os.tmpdir(), `hls_${videoId}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 3. Download the video locally to avoid FFmpeg network stream SIGSEGV
    console.log(`[HLS] Download started`);
    const inputFilePath = path.join(tempDir, 'input.mp4');
    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(inputFilePath);
      https.get(inputUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download video, status code: ${response.statusCode}`));
          return;
        }
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(inputFilePath, () => {}); // Delete the file async.
        reject(err);
      });
    });
    console.log(`[HLS] Download completed`);

    // 4. Setup HLS variants based on local file
    console.log(`[HLS] FFmpeg started`);
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputFilePath, { timeout: 432000 })
        .addOptions([
          '-threads 0',
          '-profile:v main',
          '-preset ultrafast', // Fast encoding for CPU
          '-g 48', // Keyframe interval
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
          console.error('[HLS ERROR]', err);
          reject(err);
        })
        .on('end', () => {
          console.log('[HLS] 360p completed');
          console.log('[HLS] 480p completed');
          console.log('[HLS] 720p completed');
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
    console.log('[HLS] Master playlist completed');

    // 5. Upload all HLS files to R2
    console.log(`[HLS] Uploading HLS segments to R2...`);
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
    console.log(`[HLS] R2 upload completed`);

    // 6. Cleanup local temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 7. Update Video status in DB
    video.hlsReady = true;
    video.processingStatus = 'ready';
    video.hlsMasterPlaylist = `${hlsBaseKey}/master.m3u8`;
    await video.save();

    console.log(`[HLS] Database updated: hlsReady=true`);
    console.log(`[HLS] Job completed`);
    done(null);
  } catch (error) {
    console.error(`[HLS ERROR]`, error);
    try {
      await Video.findByIdAndUpdate(videoId, { processingStatus: 'failed' });
    } catch (dbErr) {
      console.error(`[HLS ERROR] Failed to update video status:`, dbErr);
    }
    
    // Cleanup on error
    const tempDir = path.join(os.tmpdir(), `hls_${videoId}`);
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[HLS] Cleanup completed after error`);
      } catch (cleanupErr) {
        console.error(`[HLS ERROR] Cleanup failed:`, cleanupErr);
      }
    }
    
    done(error);
  }
};

// Create a queue with concurrency 1 to avoid crashing Render
export const videoQueue = fastq(processVideoWorker, 1);

export const queueVideoForProcessing = (videoId) => {
  console.log(`[HLS] Job queued`);
  videoQueue.push({ videoId }, (err) => {
    if (err) {
      console.error(`[HLS ERROR]`, err);
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
