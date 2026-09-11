import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg = null;

export const compressVideo = async (file, onProgress, abortSignal) => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
    });
  }

  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  ffmpeg.on('progress', ({ progress, time }) => {
    // progress is a ratio 0 to 1
    if (onProgress) {
      onProgress(Math.min(100, Math.round(progress * 100)));
    }
  });

  const abortHandler = () => {
    try {
      ffmpeg.terminate();
      ffmpeg = null; // force reload next time
    } catch (e) {
      console.error('Failed to terminate FFmpeg:', e);
    }
  };

  if (abortSignal) {
    abortSignal.addEventListener('abort', abortHandler);
  }

  try {
    const fileData = await fetchFile(file);
    await ffmpeg.writeFile(inputName, fileData);

    const args = [
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-vf', "scale=-2:'if(gt(ih,720),720,ih)'",
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName
    ];

    const exitCode = await ffmpeg.exec(args);
    
    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with code ${exitCode}`);
    }

    const data = await ffmpeg.readFile(outputName);
    
    // Clean up virtual files
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    if (abortSignal) {
      abortSignal.removeEventListener('abort', abortHandler);
    }

    // FFmpeg 0.12 readFile returns a Uint8Array
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    
    // Create new filename based on original
    const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const newFileName = `${originalNameWithoutExt}-compressed.mp4`;

    return new File([blob], newFileName, { type: 'video/mp4' });

  } catch (err) {
    if (abortSignal) {
      abortSignal.removeEventListener('abort', abortHandler);
    }
    
    if (abortSignal && abortSignal.aborted) {
      throw new Error("Compression cancelled");
    }
    
    throw err;
  }
};
