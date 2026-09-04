"use client";
import React, { useEffect, useRef } from "react";
import Hls from "hls.js";
import "plyr/dist/plyr.css";

export default function HlsVideoPlayer({ src, poster, isHls }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    let hls;
    const video = videoRef.current;

    import("plyr").then((module) => {
      const Plyr = module.default;
      
      const defaultOptions = {
        controls: [
          'play-large',
          'restart',
          'rewind',
          'play',
          'fast-forward',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'fullscreen',
        ],
        settings: isHls ? ['quality', 'speed'] : ['speed'], // Hide quality for legacy
        seekTime: 10,
      };

      if (isHls) {
        if (Hls.isSupported()) {
          hls = new Hls({ maxBufferLength: 30 });
          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            const availableQualities = hls.levels.map((l) => l.height);
            availableQualities.unshift(0); 
            
            defaultOptions.quality = {
              default: 0, 
              options: availableQualities,
              forced: true,
              onChange: (newQuality) => {
                if (newQuality === 0) {
                  hls.currentLevel = -1;
                } else {
                  const levelIndex = hls.levels.findIndex(l => l.height === newQuality);
                  if (levelIndex !== -1) {
                    hls.currentLevel = levelIndex;
                  }
                }
              },
            };

            playerRef.current = new Plyr(video, defaultOptions);
          });
          
          hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error("fatal network error encountered, try to recover");
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error("fatal media error encountered, try to recover");
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  break;
              }
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
          playerRef.current = new Plyr(video, defaultOptions);
        }
      } else {
        // Legacy MP4 video support
        video.src = src;
        playerRef.current = new Plyr(video, defaultOptions);
      }
    });

    return () => {
      try {
        if (hls) {
          hls.stopLoad();
          hls.destroy();
        }
      } catch (e) { console.warn("HLS cleanup error:", e); }
      
      try {
        if (playerRef.current) {
          const v = videoRef.current;
          if (v) {
             v.pause();
             v.removeAttribute('src');
             v.load();
          }
          playerRef.current.destroy();
        }
      } catch (e) { console.warn("Plyr cleanup error:", e); }
    };
  }, [src, isHls]);

  return (
    <div className="w-full max-h-[80vh] flex flex-col justify-center bg-black">
      <style dangerouslySetInnerHTML={{__html: `
        .plyr { width: 100%; max-height: 80vh; }
        .plyr__video-wrapper { background: black !important; }
      `}} />
      <video
        ref={videoRef}
        className="plyr-react plyr"
        poster={poster}
        crossOrigin="anonymous"
        controls
        playsInline
        style={{ width: '100%', maxHeight: '80vh' }}
      />
    </div>
  );
}
