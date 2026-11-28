"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function VideoPlayer({ src, poster, isHls, onDuration, onFallback }) {
  // If the HLS stream cannot play on this device/network, the parent switches to a plain MP4 source.
  const onFallbackRef = useRef(onFallback);
  onFallbackRef.current = onFallback;
  const fallbackCalledRef = useRef(false);
  const stallTimerRef = useRef(null);
  const triggerFallback = (reason) => {
    if (!isHlsRef.current || fallbackCalledRef.current || !onFallbackRef.current) return false;
    fallbackCalledRef.current = true;
    console.warn("[VideoPlayer] HLS failed, switching to MP4 fallback:", reason);
    onFallbackRef.current(reason);
    return true;
  };
  const isHlsRef = useRef(isHls);
  isHlsRef.current = isHls;

  const onDurationRef = useRef(onDuration);
  onDurationRef.current = onDuration;
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [errorState, setErrorState] = useState(null);
  const [diagnostic, setDiagnostic] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const [isSecureBlocked, setIsSecureBlocked] = useState(false);
  const isBlockedRef = useRef(false);
  const [playerNode, setPlayerNode] = useState(null);
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);
  const MAX_RETRIES = 5;

  // ---------------------------------------------------------------------------
  // Pinch-to-zoom + pan on the video, and landscape lock in fullscreen (Android).
  // ---------------------------------------------------------------------------
  const zoomRef = useRef({ scale: 1, x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);

  const applyZoom = (scale, x, y) => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    const el = player.el();
    const tech = el.querySelector(".vjs-tech");
    if (!tech) return;
    const s = Math.min(4, Math.max(1, scale));
    // Keep the video covering the frame: it can't be dragged past its own edges.
    const maxX = ((s - 1) * el.clientWidth) / 2;
    const maxY = ((s - 1) * el.clientHeight) / 2;
    const cx = s === 1 ? 0 : Math.min(maxX, Math.max(-maxX, x));
    const cy = s === 1 ? 0 : Math.min(maxY, Math.max(-maxY, y));
    zoomRef.current = { scale: s, x: cx, y: cy };
    tech.style.transform = s === 1 ? "" : `translate(${cx}px, ${cy}px) scale(${s})`;
    setZoomLevel(Math.round(s * 10) / 10);
  };

  const resetZoom = () => applyZoom(1, 0, 0);

  // Reset zoom when the lecture changes
  useEffect(() => {
    zoomRef.current = { scale: 1, x: 0, y: 0 };
    setZoomLevel(1);
  }, [src]);

  useEffect(() => {
    const player = playerRef.current;
    if (!playerNode || !player || player.isDisposed()) return;
    const el = playerNode;

    // Touches on the control bar / menus keep their normal behaviour (seek, volume, quality…)
    const onControls = (target) => target && target.closest && target.closest(".vjs-control-bar, .vjs-menu, .vjs-menu-content, button");
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    let pinch = null; // { startDist, startScale }
    let pan = null;   // { startX, startY, x, y }

    const onTouchStart = (e) => {
      if (onControls(e.target)) return;
      if (e.touches.length === 2) {
        pan = null;
        pinch = { startDist: dist(e.touches), startScale: zoomRef.current.scale };
      } else if (e.touches.length === 1 && zoomRef.current.scale > 1) {
        pan = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, x: zoomRef.current.x, y: zoomRef.current.y };
      }
    };

    const onTouchMove = (e) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault(); // stop the browser from zooming the whole page
        const scale = pinch.startScale * (dist(e.touches) / pinch.startDist);
        applyZoom(scale, zoomRef.current.x, zoomRef.current.y);
      } else if (pan && e.touches.length === 1) {
        e.preventDefault(); // stop page scroll while dragging the zoomed video
        const t = e.touches[0];
        applyZoom(zoomRef.current.scale, pan.x + (t.clientX - pan.startX), pan.y + (t.clientY - pan.startY));
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinch = null;
      if (e.touches.length === 0) pan = null;
      if (zoomRef.current.scale < 1.05) applyZoom(1, 0, 0);
    };

    // Laptop trackpad pinch arrives as ctrl+wheel; Ctrl+scroll with a mouse works the same way.
    const onWheel = (e) => {
      if (!e.ctrlKey || onControls(e.target)) return;
      e.preventDefault();
      const { scale, x, y } = zoomRef.current;
      applyZoom(scale * Math.exp(-e.deltaY * 0.01), x, y);
    };

    // Fullscreen: turn the phone to landscape for normal (wide) videos, back to portrait on exit.
    // screen.orientation.lock only works in fullscreen on Android Chrome; elsewhere it is ignored.
    const onFullscreenChange = () => {
      const orientation = typeof screen !== "undefined" ? screen.orientation : null;
      if (player.isFullscreen()) {
        const tech = el.querySelector("video");
        const isPortraitVideo = tech && tech.videoHeight > tech.videoWidth;
        if (orientation && orientation.lock && !isPortraitVideo) {
          orientation.lock("landscape").catch(() => {});
        }
      } else {
        if (orientation && orientation.unlock) {
          try { orientation.unlock(); } catch (_) {}
        }
        applyZoom(1, 0, 0);
      }
    };

    const onResize = () => {
      const { scale, x, y } = zoomRef.current;
      if (scale > 1) applyZoom(scale, x, y); // re-clamp pan limits after rotation
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    player.on("fullscreenchange", onFullscreenChange);
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      if (!player.isDisposed()) player.off("fullscreenchange", onFullscreenChange);
    };
  }, [playerNode]);

  // Clear error state whenever the video source changes
  useEffect(() => {
    setErrorState(null);
    retryCountRef.current = 0;
    isRetryingRef.current = false;
    clearTimeout(stallTimerRef.current);
  }, [src]);

  const setBlocked = (blocked) => {
    setIsSecureBlocked(blocked);
    isBlockedRef.current = blocked;
    if (blocked && playerRef.current) {
      if (!playerRef.current.paused()) {
        playerRef.current.pause();
      }
      playerRef.current.muted(true);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setBlocked(true);
      } else {
        setBlocked(false);
      }
    };
    
    // Also handle window blur as an extra precaution
    const handleBlur = () => {
      setIsFocused(false);
      setBlocked(true);
    };

    const handleFocus = () => {
      setIsFocused(true);
      if (!document.hidden) {
        setBlocked(false);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !src) return;
    fallbackCalledRef.current = false;

    if (typeof window !== "undefined") {
      window.videojs = videojs;
      require("videojs-contrib-quality-levels");
      require("videojs-http-source-selector");

      // Global VHS buffer settings to prevent infinite reloading
      if (videojs.Vhs) {
        // Buffer further ahead so short network dips don't cause a stall/reload
        videojs.Vhs.GOAL_BUFFER_LENGTH = 60;
        videojs.Vhs.MAX_GOAL_BUFFER_LENGTH = 120;
        videojs.Vhs.BACK_BUFFER_LENGTH = 30;
      }

      // Fix CORS issue: only send cookies to our backend API, not to Cloudflare R2
      if (videojs.Vhs && videojs.Vhs.xhr) {
        videojs.Vhs.xhr.beforeRequest = function (options) {
          if (options.uri && options.uri.includes("/api/")) {
            options.withCredentials = true;
            try {
              const token = localStorage.getItem('token');
              if (token) {
                options.headers = options.headers || {};
                options.headers.Authorization = `Bearer ${token}`;
              }
            } catch (e) {
              console.warn("Could not access localStorage for video token", e);
            }
          } else {
            options.withCredentials = false;
          }
          return options;
        };
      }
    }

    let finalSrc = src;
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem('token');
        if (token && finalSrc && finalSrc.includes('/api/')) {
          const separator = finalSrc.includes('?') ? '&' : '?';
          finalSrc = `${finalSrc}${separator}token=${token}`;
        }
      } catch (e) {}
    }

    const options = {
      autoplay: false,
      muted: true, // Required for iOS autoplay/inline rules
      playsinline: true, // Native videojs option for inline playback
      controls: true,
      responsive: true,
      fluid: false,
      fill: true,
      poster: poster || "",
      preload: "auto",
      controlBar: {
        children: [
          "playToggle",
          "volumePanel",
          "currentTimeDisplay",
          "timeDivider",
          "durationDisplay",
          "customControlSpacer",
          "progressControl",
          "subsCapsButton",
          "fullscreenToggle",
        ],
      },
      html5: {
        vhs: {
          withCredentials: false,
          overrideNative: true,
          // Remember measured bandwidth between videos so playback starts at a sensible quality
          useBandwidthFromLocalStorage: true,
          // Be patient with slow segment/playlist responses instead of failing the stream
          maxPlaylistRetries: 5,
          playlistExclusionDuration: 30,
          // Start at 800 Kbps — VHS will measure actual bandwidth and climb from 360p upward.
          // This avoids immediately requesting a large 720p segment on startup.
          initialBandwidth: 800000,
          // Start with the lowest rendition (360p) on first play for fastest first frame,
          // then let VHS upgrade quality based on measured bandwidth.
          enableLowInitialPlaylist: true,
          // Do NOT cap rendition selection based on player CSS dimensions.
          // Without this, a small player window silently blocks 720p.
          limitRenditionByPlayerDimensions: false,
          // Keep selection purely bandwidth/buffer driven, not pixel-ratio driven.
          useDevicePixelRatio: false,
        },
      },
      sources: [
        {
          src: finalSrc,
          type: isHls ? "application/x-mpegURL" : "video/mp4",
        },
      ],
    };

    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered", "vjs-default-skin");
      videoElement.setAttribute("playsinline", "true");
      videoElement.setAttribute("webkit-playsinline", "true");
      containerRef.current.appendChild(videoElement);

      const player = videojs(videoElement, options, function onPlayerReady() {
        if (typeof player.httpSourceSelector === 'function') {
          player.httpSourceSelector();
        }

        player.on('error', function() {
          const err = player.error();
          console.error("[VideoPlayer] Playback Error:", err);
          if (err && err.code) {
            console.error("[VideoPlayer] Error Code:", err.code, "Message:", err.message);
          }
          if (err && err.networkDetails) {
            console.error("[VideoPlayer] Network Details:", err.networkDetails);
          }
          console.error("[VideoPlayer] Failing Source URL:", player.src());
        });

        // Watchdog: if the stream sits on "buffering" for 12s without progressing, give up on HLS (~12s)
        const clearStall = () => clearTimeout(stallTimerRef.current);
        const armStall = () => {
          clearStall();
          stallTimerRef.current = setTimeout(() => {
            if (playerRef.current && !playerRef.current.isDisposed() && !playerRef.current.paused()) {
              triggerFallback('stalled');
            }
          }, 12000);
        };
        player.on('waiting', armStall);
        player.on('play', armStall);
        ['playing', 'timeupdate', 'pause', 'ended', 'canplaythrough'].forEach((ev) => player.on(ev, clearStall));

        player.el().setAttribute('tabIndex', '-1');
        player.el().focus();
        setPlayerNode(player.el());

        player.el().addEventListener('keydown', (e) => {
          if (isBlockedRef.current || !isFocused) {
            e.preventDefault();
            return;
          }
          if (e.code === 'Space') {
            e.preventDefault();
            player.paused() ? player.play() : player.pause();
          } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            const newTime = Math.max(0, player.currentTime() - 10);
            player.currentTime(newTime);
          } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            const newTime = Math.min(player.duration(), player.currentTime() + 10);
            player.currentTime(newTime);
          }
        });

        // --- Duration Preservation Fix ---
        let maxDuration = 0;
        player.on('durationchange', () => {
          const currentDuration = player.duration();
          if (currentDuration > maxDuration) {
            maxDuration = currentDuration;
          }
        });

        const originalDuration = player.duration.bind(player);
        player.duration = function(seconds) {
          if (seconds !== undefined) {
            return originalDuration(seconds);
          }
          const current = originalDuration();
          if (maxDuration > 0 && current < maxDuration) {
            return maxDuration;
          }
          return current;
        };

        const ControlBar = videojs.getComponent("ControlBar");
        const Button = videojs.getComponent("Button");

        if (!player.getChild("controlBar").getChild("seekBackButton")) {
          class SeekBackButton extends Button {
            constructor(player, options) {
              super(player, options);
              this.controlText("Seek Back 10s");
            }
            buildCSSClass() {
              return `vjs-seek-back-btn ${super.buildCSSClass()}`;
            }
            handleClick() {
              let currentTime = player.currentTime();
              player.currentTime(Math.max(0, currentTime - 10));
            }
          }
          videojs.registerComponent("SeekBackButton", SeekBackButton);
          
          class SeekForwardButton extends Button {
            constructor(player, options) {
              super(player, options);
              this.controlText("Seek Forward 10s");
            }
            buildCSSClass() {
              return `vjs-seek-forward-btn ${super.buildCSSClass()}`;
            }
            handleClick() {
              let currentTime = player.currentTime();
              let duration = player.duration();
              player.currentTime(Math.min(duration, currentTime + 10));
            }
          }
          videojs.registerComponent("SeekForwardButton", SeekForwardButton);

          const controlBar = player.getChild("controlBar");
          controlBar.addChild("SeekBackButton", {}, 1);
          controlBar.addChild("SeekForwardButton", {}, 2);
        }

        // --- Custom Quality Selector ---
        if (!videojs.getComponent("QualityMenuButton")) {
          const MenuButton = videojs.getComponent("MenuButton");
          const MenuItem = videojs.getComponent("MenuItem");

          class QualityMenuItem extends MenuItem {
            constructor(player, options) {
              super(player, options);
              this.level = options.level;
            }
            handleClick(event) {
              super.handleClick(event);
              const qualityLevels = this.player().qualityLevels();
              for (let i = 0; i < qualityLevels.length; i++) {
                let level = qualityLevels[i];
                if (this.options_.level === "auto") {
                  level.enabled = true;
                } else {
                  level.enabled = (level.height === this.options_.level.height);
                }
              }
              this.player().trigger("qualitySelected", this.options_.level);
            }
          }
          videojs.registerComponent("QualityMenuItem", QualityMenuItem);

          class QualityMenuButton extends MenuButton {
            constructor(player, options) {
              super(player, options);
              this.controlText("Quality");
              // Track whether VHS ABR (auto) is active or user has manually locked a rendition.
              let isAutoMode = true;

              player.qualityLevels().on("addqualitylevel", () => this.update());
              player.on("qualitySelected", (e, level) => {
                const el = this.el().querySelector(".vjs-icon-placeholder");
                if (level === "auto") {
                  isAutoMode = true;
                  // Reset to plain "Auto"; the change listener will append rendition when VHS picks one.
                  if (el) el.innerHTML = "Auto";
                } else {
                  isAutoMode = false;
                  if (el) el.innerHTML = `${level.height}p`;
                }
                
                // Update selected state of menu items
                const items = this.items || [];
                items.forEach(item => {
                  item.selected(item.options_.level === level);
                });
              });

              // When VHS switches renditions in Auto mode, update the button label
              // to show which quality is actually playing, e.g. "Auto (720p)".
              // This is purely cosmetic — it does not interfere with VHS ABR logic.
              player.qualityLevels().on("change", () => {
                if (!isAutoMode) return;
                const ql = player.qualityLevels();
                const selectedIdx = ql.selectedIndex;
                const activeLevel = selectedIdx >= 0 ? ql[selectedIdx] : null;
                const el = this.el().querySelector(".vjs-icon-placeholder");
                if (el && activeLevel && activeLevel.height) {
                  el.innerHTML = `Auto (${activeLevel.height}p)`;
                } else if (el) {
                  el.innerHTML = "Auto";
                }
              });
              
              // Initial text
              setTimeout(() => {
                const el = this.el().querySelector(".vjs-icon-placeholder");
                if (el && !el.innerHTML) el.innerHTML = "Auto";
              }, 100);
            }

            buildCSSClass() {
              return `vjs-quality-selector ${super.buildCSSClass()}`;
            }

            createItems() {
              const items = [];
              const qualityLevels = this.player().qualityLevels();

              items.push(
                new QualityMenuItem(this.player(), {
                  level: "auto",
                  label: "Auto",
                  selected: true,
                })
              );

              const seenHeights = new Set();
              for (let i = 0; i < qualityLevels.length; i++) {
                let level = qualityLevels[i];
                if (level.height && !seenHeights.has(level.height)) {
                  seenHeights.add(level.height);
                  items.push(
                    new QualityMenuItem(this.player(), {
                      level: level,
                      label: `${level.height}p`,
                      selected: false,
                    })
                  );
                }
              }

              items.sort((a, b) => {
                if (a.options_.level === "auto") return -1;
                if (b.options_.level === "auto") return 1;
                return b.options_.level.height - a.options_.level.height;
              });

              return items;
            }
          }
          videojs.registerComponent("QualityMenuButton", QualityMenuButton);
        }

        if (isHls) {
          const controlBar = player.getChild("controlBar");
          if (!controlBar.getChild("QualityMenuButton") && !controlBar.getChild("qualityMenuButton")) {
            const fullscreenIdx = controlBar.children().findIndex(c => c.name() === "fullscreenToggle" || c.name() === "FullscreenToggle");
            const insertIdx = fullscreenIdx > -1 ? fullscreenIdx : controlBar.children().length;
            controlBar.addChild("QualityMenuButton", {}, insertIdx);
          }
        }

        // --- Custom Speed Selector (replaces broken built-in playbackRateMenuButton) ---
        if (!videojs.getComponent("SpeedMenuButton")) {
          const MenuButton = videojs.getComponent("MenuButton");
          const MenuItem = videojs.getComponent("MenuItem");

          class SpeedMenuItem extends MenuItem {
            constructor(player, options) {
              super(player, options);
              this.rate = options.rate;
            }
            handleClick(event) {
              super.handleClick(event);
              this.player().playbackRate(this.options_.rate);
              this.player().trigger("speedSelected", this.options_.rate);
            }
          }
          videojs.registerComponent("SpeedMenuItem", SpeedMenuItem);

          class SpeedMenuButton extends MenuButton {
            constructor(player, options) {
              super(player, options);
              this.controlText("Playback Speed");

              player.on("speedSelected", (e, rate) => {
                const el = this.el().querySelector(".vjs-icon-placeholder");
                if (el) el.innerHTML = rate === 1 ? "1x" : rate + "x";

                // Update selected state of menu items
                const items = this.items || [];
                items.forEach(item => {
                  item.selected(item.options_.rate === rate);
                });
              });

              // Set initial text
              setTimeout(() => {
                const el = this.el().querySelector(".vjs-icon-placeholder");
                if (el && !el.innerHTML) el.innerHTML = "1x";
              }, 100);
            }

            buildCSSClass() {
              return `vjs-speed-selector ${super.buildCSSClass()}`;
            }

            createItems() {
              const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
              return speeds.map(rate => {
                return new SpeedMenuItem(this.player(), {
                  rate: rate,
                  label: rate === 1 ? "Normal" : rate + "x",
                  selected: rate === 1,
                });
              });
            }
          }
          videojs.registerComponent("SpeedMenuButton", SpeedMenuButton);
        }

        // Add speed selector to control bar (before fullscreen button)
        {
          const controlBar = player.getChild("controlBar");
          if (!controlBar.getChild("SpeedMenuButton") && !controlBar.getChild("speedMenuButton")) {
            const fullscreenIdx = controlBar.children().findIndex(c => c.name() === "fullscreenToggle" || c.name() === "FullscreenToggle");
            const insertIdx = fullscreenIdx > -1 ? fullscreenIdx : controlBar.children().length;
            controlBar.addChild("SpeedMenuButton", {}, insertIdx);
          }
        }
        
        // --- Diagnostic Logging & Video Stutter Guard ---
        let t0, t_master, t_metadata, t_canplay, t_playing;
        
        player.on('play', () => {
          if (!t0) t0 = performance.now();
          if (typeof window !== 'undefined') {
            window.__LMS_IS_VIDEO_ACTIVE = true;
            window.dispatchEvent(new CustomEvent('video_playback_active', { detail: { active: true } }));
          }
        });

        player.on('pause', () => {
          if (typeof window !== 'undefined') {
            window.__LMS_IS_VIDEO_ACTIVE = false;
            window.dispatchEvent(new CustomEvent('video_playback_active', { detail: { active: false } }));
          }
        });

        player.on('ended', () => {
          if (typeof window !== 'undefined') {
            window.__LMS_IS_VIDEO_ACTIVE = false;
            window.dispatchEvent(new CustomEvent('video_playback_active', { detail: { active: false } }));
          }
        });
        
        player.on('loadedmetadata', () => {
          t_metadata = performance.now();
          try {
            const d = player.duration();
            if (Number.isFinite(d) && d > 0) onDurationRef.current?.(d);
          } catch (e) {}
          if (isHls && player.qualityLevels) {
             const ql = player.qualityLevels();
             console.log("[QUALITY DEBUG]");
             console.log("quality level count: " + ql.length);
             const heights = [];
             const bandwidths = [];
             for(let i = 0; i < ql.length; i++) {
                if(ql[i].height) heights.push(ql[i].height);
                if(ql[i].bitrate) bandwidths.push(ql[i].bitrate);
             }
             console.log("available heights: " + heights.join(", "));
             console.log("available bandwidths: " + bandwidths.join(", "));
          }
        });
        
        player.on('canplay', () => {
          t_canplay = performance.now();
        });
        
        player.on('playing', () => {
          t_playing = performance.now();
          if (t0) {
            console.log("[STARTUP]");
            console.log("master: (logged in network tab)");
            console.log("variant: (logged in network tab)");
            console.log("firstSegment: (logged in network tab)");
            console.log("playing: " + Math.round(t_playing - t0) + " ms after play click");
            console.log("total: " + Math.round(t_playing - t0) + " ms");
          }
        });

        // --- ABR Debug Logging (development) ---
        // Logs [ABR DEBUG] to console on every VHS rendition switch and on first play.
        // Allows verifying that VHS ABR is genuinely selecting different HLS renditions
        // in response to measured bandwidth and buffer conditions.
        if (isHls) {
          player.qualityLevels().on('change', function () {
            const ql = player.qualityLevels();
            const selectedIdx = ql.selectedIndex;
            const activeLevel = selectedIdx >= 0 ? ql[selectedIdx] : null;
            const tech = player.tech(true);
            const systemBw = tech && tech.vhs && tech.vhs.systemBandwidth
              ? Math.round(tech.vhs.systemBandwidth / 1000)
              : 'n/a';
            const buffered = player.buffered();
            const ct = player.currentTime();
            let bufLen = 'n/a';
            if (buffered && buffered.length > 0) {
              for (let i = 0; i < buffered.length; i++) {
                if (buffered.start(i) <= ct && ct <= buffered.end(i)) {
                  bufLen = (buffered.end(i) - ct).toFixed(1) + 's';
                  break;
                }
              }
            }
            console.log(
              `[ABR DEBUG] quality=${activeLevel ? activeLevel.height + 'p' : 'n/a'}` +
              ` | bandwidth=${systemBw}kbps` +
              ` | buffer=${bufLen}`
            );
          });

          // Log the initial selected quality on first frame — verifies fast-start rendition.
          let abrInitialLogged = false;
          player.on('playing', function () {
            if (abrInitialLogged) return;
            abrInitialLogged = true;
            const ql = player.qualityLevels();
            const selectedIdx = ql.selectedIndex;
            const activeLevel = selectedIdx >= 0 ? ql[selectedIdx] : null;
            const tech = player.tech(true);
            const systemBw = tech && tech.vhs && tech.vhs.systemBandwidth
              ? Math.round(tech.vhs.systemBandwidth / 1000)
              : 'n/a';
            console.log(
              `[ABR DEBUG] initial | quality=${activeLevel ? activeLevel.height + 'p' : 'n/a'}` +
              ` | bandwidth=${systemBw}kbps`
            );
          });
        }

      });

      playerRef.current = player;

      const handlePlaybackError = () => {
        const err = player.error();
        console.error("Video.js Error:", err);

        // Auto retry up to MAX_RETRIES with progressive backoff on transient network drops
        if (retryCountRef.current < MAX_RETRIES && !isRetryingRef.current) {
          isRetryingRef.current = true;
          retryCountRef.current += 1;
          const delay = retryCountRef.current * 1000;
          console.warn(`[VideoPlayer] Retrying video in ${delay}ms (Attempt ${retryCountRef.current}/${MAX_RETRIES})...`);

          // Remember where the student was so a retry resumes there instead of restarting from 0:00
          const resumeAt = (() => { try { return player.currentTime() || 0; } catch (e) { return 0; } })();
          const wasPlaying = (() => { try { return !player.paused(); } catch (e) { return false; } })();

          setTimeout(() => {
            if (playerRef.current && !playerRef.current.isDisposed()) {
              const p = playerRef.current;
              p.error(null);
              p.src(options.sources);
              p.one('loadedmetadata', () => {
                try {
                  if (resumeAt > 1) p.currentTime(resumeAt);
                  if (wasPlaying) p.play()?.catch(() => {});
                } catch (e) {}
              });
              p.load();
            }
            isRetryingRef.current = false;
          }, delay);
          return;
        }

        if (triggerFallback(`error ${err?.code ?? ''}`)) return;

        let failingHost = "";
        try { failingHost = new URL(player.currentSrc() || "").host; } catch (e) {}
        const detail = `${err?.code ? `Code ${err.code}` : ""}${failingHost ? ` · ${failingHost}` : ""}`;
        setDiagnostic(detail);

        if (err && err.code !== 4) {
          setErrorState("Unable to load video. Please try again.");
        } else if (err && err.code === 4) {
          setErrorState("Unable to load video. Source not supported or unreachable.");
        } else {
          setErrorState("Unable to load video. Please try again.");
        }
      };

      player.on("error", handlePlaybackError);
    } else {
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.error(null);
      player.src(options.sources);
      if (poster) {
        player.poster(poster);
      }
    }
  }, [src, isHls, poster]);

  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (typeof window !== 'undefined') {
        window.__LMS_IS_VIDEO_ACTIVE = false;
        window.dispatchEvent(new CustomEvent('video_playback_active', { detail: { active: false } }));
      }
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  const handleManualRetry = () => {
    setErrorState(null);
    retryCountRef.current = 0;
    isRetryingRef.current = false;
    if (playerRef.current && !playerRef.current.isDisposed()) {
      playerRef.current.error(null);
      if (src) {
        playerRef.current.src({
          src,
          type: isHls ? "application/x-mpegURL" : "video/mp4"
        });
        playerRef.current.load();
      }
    }
  };

  if (errorState) {
    return (
      <div className="w-full h-full min-h-[300px] relative flex flex-col items-center justify-center bg-gray-900 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-white text-lg font-medium">{errorState}</p>
        <p className="text-gray-400 text-sm mt-2 max-w-md">There was a problem communicating with the video server. Please check your network or try again.</p>
        {diagnostic && <p className="text-gray-600 text-[11px] mt-2 font-mono">{diagnostic}</p>}
        <button
          onClick={handleManualRetry}
          className="mt-5 px-5 py-2.5 bg-[#c71e22] hover:bg-[#a5191c] text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry Playback
        </button>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="w-full h-full min-h-[300px] relative flex flex-col items-center justify-center bg-gray-900 rounded-xl">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-600 border-t-[#c71e22] mb-3"></div>
        <p className="text-gray-400 text-sm font-medium">Loading video stream...</p>
      </div>
    );
  }

  const renderOverlays = () => {
    return (
      <>
        {isSecureBlocked && (
          <div className="absolute inset-0 bg-black z-[9999] flex items-center justify-center flex-col pointer-events-auto p-4 md:p-6">
            <svg className="w-8 h-8 md:w-12 md:h-12 text-red-500 mb-2 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-white text-base md:text-lg font-bold text-center leading-tight">Playback Paused (Security Protection)</p>
            <p className="text-gray-400 text-xs md:text-sm mt-2 max-w-sm text-center leading-relaxed">
              Video hidden to prevent screen recording and snooping. Resume by returning to the player.
            </p>
          </div>
        )}
        {!isFocused && !isSecureBlocked && (
          <div className="absolute inset-0 bg-black z-[9999] flex items-center justify-center flex-col pointer-events-auto p-4 md:p-6">
            <svg className="w-8 h-8 md:w-12 md:h-12 text-gray-500 mb-2 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-white text-base md:text-lg font-bold text-center leading-tight">Playback Paused</p>
            <p className="text-gray-400 text-xs md:text-sm mt-2 max-w-sm text-center leading-relaxed">
              For security reasons, video playback is hidden while this window is out of focus. Click here to resume.
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <div 
      data-vjs-player 
      className={`w-full h-full relative ${isSecureBlocked || !isFocused ? 'pointer-events-none' : ''}`}
      style={{ borderRadius: "inherit" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={containerRef} className="w-full h-full pointer-events-auto" style={{ borderRadius: "inherit" }}></div>
      {playerNode ? createPortal(renderOverlays(), playerNode) : renderOverlays()}
      <style dangerouslySetInnerHTML={{__html: `
        .lms-video-container {
          aspect-ratio: 16 / 9;
          width: 100%;
          max-width: 100%;
        }
        .video-js {
          width: 100%;
          height: 100%;
        }
        .video-js .vjs-tech {
          object-fit: contain !important; /* Ensure video is never cropped */
        }
        .vjs-seek-back-btn, .vjs-seek-forward-btn {
          cursor: pointer;
          font-family: VideoJS;
          font-weight: normal;
          font-style: normal;
        }
        .vjs-seek-back-btn .vjs-icon-placeholder:before {
          content: "\\f11a"; /* rewind icon */
        }
        .vjs-seek-forward-btn .vjs-icon-placeholder:before {
          content: "\\f11f"; /* forward icon */
        }
        /* Match Jains LMS theme */
        .video-js .vjs-play-progress, .video-js .vjs-volume-level {
          background-color: #c71e22;
        }
        
        /* 1. Duration Display Fix */
        .video-js .vjs-duration,
        .video-js .vjs-time-divider,
        .video-js .vjs-current-time {
          display: block !important;
        }
        .video-js .vjs-time-divider {
          padding: 0 4px;
        }

        /* 2. Quality Selector Fix */
        .video-js .vjs-quality-selector {
          display: flex !important; /* Forces show even if items are populating */
          align-items: center;
          justify-content: center;
        }
        .vjs-quality-selector .vjs-icon-placeholder {
          font-family: inherit;
          font-size: 1.2em;
          line-height: 1.67;
          text-align: center;
        }
        .vjs-quality-selector .vjs-menu-button {
          width: 4em;
        }

        .video-js .vjs-big-play-button {
          background-color: rgba(199, 30, 34, 0.8);
          border: none;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          line-height: 80px;
          margin-top: -40px;
          margin-left: -40px;
        }
        .video-js:hover .vjs-big-play-button {
          background-color: rgba(199, 30, 34, 1);
        }

        /* 2-Row Control Bar Layout (YouTube Style) - Global */
        .video-js .vjs-control-bar {
          height: auto !important; /* allow wrapping */
          flex-wrap: wrap;
          padding-bottom: 5px;
          background-color: rgba(43, 51, 63, 0.7); /* ensure bg covers both rows */
        }
        
        /* Make progress bar full width and put it on top (Row 1) */
        .video-js .vjs-progress-control {
          width: 100% !important;
          height: 15px !important;
          order: -1; /* push to top */
          flex-basis: 100%;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
        }

        /* Spacer pushes elements after it to the right */
        .video-js .vjs-custom-control-spacer {
          display: flex;
          flex: 1 1 auto;
        }

        /* Responsive Control Bar for Mobile (Shrink sizes) */
        @media (max-width: 768px) {
          /* Shrink button widths to fit better */
          .video-js .vjs-button, 
          .video-js .vjs-menu-button {
            width: 2.5em !important;
          }

          /* Keep quality selector slightly wider but still smaller than desktop */
          .vjs-quality-selector .vjs-menu-button {
            width: 3.5em !important;
          }
          
          /* Fix Quality button text overflowing */
          .video-js .vjs-quality-selector .vjs-icon-placeholder {
            font-size: 0.9em;
            line-height: 2.2;
          }

          /* Ensure time controls are readable but compact */
          .video-js .vjs-time-control {
            padding-left: 2px !important;
            padding-right: 2px !important;
            font-size: 0.8em;
            line-height: 3;
          }

          /* Hide PiP on mobile */
          .video-js .vjs-picture-in-picture-control {
            display: none !important;
          }
        }

        /* ===== Custom Speed Selector ===== */
        .video-js .vjs-speed-selector {
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
        .vjs-speed-selector .vjs-icon-placeholder {
          font-family: inherit;
          font-size: 1.2em;
          line-height: 1.67;
          text-align: center;
        }
        .vjs-speed-selector .vjs-menu-button {
          width: 4em;
        }

        @media (max-width: 768px) {
          .video-js .vjs-speed-selector .vjs-icon-placeholder {
            font-size: 0.9em;
            line-height: 2.2;
          }
        }
      `}} />
    </div>
  );
}
