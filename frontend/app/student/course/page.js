"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi, API_URL } from "@/lib/api";
import dynamic from "next/dynamic";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), { ssr: false });

function StudentCourseDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get("id");

  const [selectedCourseId, setSelectedCourseId] = useState(courseId || "");
  const [course, setCourse] = useState(null);
  const [coursesList, setCoursesList] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playingVideo, setPlayingVideo] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const playerCardRef = useRef(null);

  // Friendly duration formatter matching screenshots: "1h 46m", "34m"
  const formatDurationFriendly = (seconds) => {
    if (!seconds || seconds <= 0) return "--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    return `${m}m`;
  };

  // Friendly date formatter matching screenshots: "4 Nov 2026", "28 Oct 2026"
  const formatDateFriendly = (dateStr) => {
    if (!dateStr) return "4 Nov 2026";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "4 Nov 2026";
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return "4 Nov 2026";
    }
  };

  // Expiry date formatter matching screenshots: "Available until 2 Feb 2027"
  const formatExpiryFriendly = (expiresAt, createdAt) => {
    if (expiresAt) return formatDateFriendly(expiresAt);
    try {
      const base = createdAt ? new Date(createdAt) : new Date();
      const exp = new Date(base.getTime() + 90 * 24 * 60 * 60 * 1000);
      return formatDateFriendly(exp);
    } catch (e) {
      return "2 Feb 2027";
    }
  };

  const getOptimizedVideoUrl = (url) => {
    if (!url) return "";
    if (url.includes("cloudinary.com") && url.includes("/upload/")) {
      return url.replace("/upload/", "/upload/f_auto,q_auto/");
    }
    return url;
  };

  // Real length from the player's metadata: show it immediately and save it if the server doesn't have it yet
  const handleVideoDuration = (seconds) => {
    const vid = playingVideo;
    if (!vid || !seconds) return;
    const secs = Math.round(seconds);
    if (vid.duration === secs) return;
    setVideos((prev) => prev.map((v) => (v._id === vid._id ? { ...v, duration: secs } : v)));
    setPlayingVideo((prev) => (prev && prev._id === vid._id ? { ...prev, duration: secs } : prev));
    if (!vid.duration) {
      const cid = courseId || course?._id || vid.courseId;
      fetchApi(`/student/courses/${cid}/videos/${vid._id}/duration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: secs }),
      }).catch(() => {});
    }
  };

  const handlePlayVideo = async (video, scrollIntoView = false, targetCourseId = null) => {
    if (!video) return;
    setPlayingVideo(video);
    setUrlLoading(true);

    const effectiveCourseId = targetCourseId || courseId || course?._id;

    if (scrollIntoView && playerCardRef.current) {
      playerCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    try {
      if (video.hlsReady && video.storageProvider === "r2") {
        setPlaybackUrl(`${API_URL}/courses/${effectiveCourseId}/videos/${video._id}/hls/master.m3u8`);
      } else if (video.storageProvider === "r2") {
        const res = await fetchApi(`/courses/${effectiveCourseId}/videos/${video._id}/playback-url`);
        if (res.ok) {
          const data = await res.json();
          setPlaybackUrl(data.url);
        } else {
          setPlaybackUrl(video.secureUrl || "");
        }
      } else {
        setPlaybackUrl(getOptimizedVideoUrl(video.secureUrl));
      }
    } catch (err) {
      console.error("Playback URL error:", err);
      setPlaybackUrl(video.secureUrl || "");
    } finally {
      setUrlLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let redirecting = false;
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        setError("");

        let activeId = courseId;
        if (!activeId && typeof window !== "undefined") {
          activeId = localStorage.getItem("lms_last_course_id");
        }

        // Fetch course list and details in parallel for maximum speed
        const [listRes, initialCourseRes, initialVideoRes] = await Promise.all([
          fetchApi("/student/courses"),
          activeId ? fetchApi(`/student/courses/${activeId}`) : Promise.resolve(null),
          activeId ? fetchApi(`/student/courses/${activeId}/videos`) : Promise.resolve(null),
        ]);

        let resolvedList = [];
        let listLoaded = false;
        if (listRes && listRes.ok) {
          const list = await listRes.json();
          if (Array.isArray(list)) {
            resolvedList = list;
            listLoaded = true;
            if (isMounted) setCoursesList(list);
          }
        }

        // The remembered/linked course may be expired, revoked or deleted. If the student
        // can't open it, fall back to their first available course instead of erroring out.
        const isAccessible = (id) => resolvedList.some((c) => String(c._id) === String(id));
        const initialFailed = activeId && initialCourseRes && !initialCourseRes.ok;
        if (activeId && listLoaded && (!isAccessible(activeId) || initialFailed)) {
          try {
            if (localStorage.getItem("lms_last_course_id") === activeId) {
              localStorage.removeItem("lms_last_course_id");
            }
          } catch (e) {}
          if (resolvedList.length > 0 && resolvedList[0]._id && !isAccessible(activeId)) {
            activeId = resolvedList[0]._id;
            try { localStorage.setItem("lms_last_course_id", activeId); } catch (e) {}
            redirecting = true;
            if (isMounted) router.replace(`/student/course/?id=${activeId}`);
            return; // the effect re-runs for the new id
          }
          if (!isAccessible(activeId)) {
            if (isMounted) {
              setError("You don't have any active course right now. Please contact the Jains Computer office.");
              setLoading(false);
            }
            return;
          }
        }

        if (!activeId) {
          if (resolvedList.length > 0 && resolvedList[0]._id) {
            activeId = resolvedList[0]._id;
            if (typeof window !== "undefined") {
              localStorage.setItem("lms_last_course_id", activeId);
            }
            redirecting = true;
            router.replace(`/student/course/?id=${activeId}`);
            return; // the effect re-runs for the new id
          } else {
            if (isMounted) {
              setError("No enrolled course found.");
              setLoading(false);
            }
            return;
          }
        } else if (typeof window !== "undefined") {
          localStorage.setItem("lms_last_course_id", activeId);
        }

        // Use the parallel responses if available, or fetch them if activeId was just resolved
        let courseData = null;
        if (initialCourseRes && initialCourseRes.ok) {
          courseData = await initialCourseRes.json();
        } else {
          const cRes = await fetchApi(`/student/courses/${activeId}`);
          if (cRes.ok) courseData = await cRes.json();
        }

        if (!courseData) {
          throw new Error("Failed to load course details.");
        }
        if (isMounted) setCourse(courseData);

        let videoData = [];
        if (initialVideoRes && initialVideoRes.ok) {
          videoData = await initialVideoRes.json();
        } else {
          const vRes = await fetchApi(`/student/courses/${activeId}/videos`);
          if (vRes.ok) videoData = await vRes.json();
        }

        if (Array.isArray(videoData)) {
          if (isMounted) {
            setVideos(videoData);
            if (videoData.length > 0) {
              handlePlayVideo(videoData[0], false, activeId);
            }
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load course.");
      } finally {
        if (isMounted && !redirecting) setLoading(false);
      }
    };

    fetchCourseData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Poll for any background processing videos
  useEffect(() => {
    const hasProcessing = videos.some((v) => v.processingStatus === "processing");
    if (!hasProcessing) return;

    const intervalId = setInterval(async () => {
      try {
        const videoRes = await fetchApi(`/student/courses/${courseId}/videos`);
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          setVideos(videoData);
        }
      } catch (err) {}
    }, 5000);

    return () => clearInterval(intervalId);
  }, [videos, courseId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-white/60 text-sm font-medium">Loading classroom recordings...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-[#1C1C1E]/95 border border-red-500/20 rounded-[8px] p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 rounded-[8px] flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Unavailable</h2>
          <p className="text-white/60 text-sm mb-6">{error || "Could not retrieve course material."}</p>
          <Link
            href="/student/courses/"
            className="inline-block bg-gradient-to-b from-[#ff2a2a] to-[#a3000a] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-[0_6px_20px_-4px_rgba(255,40,40,0.6)]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const studentIdentifier = dashboardData?.enrollmentNumber || dashboardData?.studentId || "JAINS COMPUTER";

  return (
    <div className="text-[#f6f3f3] max-w-5xl mx-auto px-3 sm:px-4 pb-10">
      {/* 1. TOP HEADER SECTION */}
      <section className="pt-2 sm:pt-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Learning
        </h1>
        <p className="text-xs sm:text-sm text-[#8f8a8b] mt-0.5">
          Watch your classroom recordings
        </p>

        {/* Multi-course switcher chips (if student is enrolled in multiple courses) */}
        {coursesList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mt-3.5 pb-1">
            {coursesList.map((c) => (
              <button
                key={c._id}
                onClick={() => router.push(`/student/course/?id=${c._id}`)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap shrink-0 ${
                  c._id === courseId
                    ? "bg-[#ff2a2a]/20 border-[#ff2a2a]/60 text-white font-bold shadow-[0_0_12px_rgba(255,42,42,0.3)]"
                    : "bg-white/[0.03] border-white/10 text-[#8f8a8b] hover:text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* YOUR COURSE Eyebrow + Name */}
        <div className="mt-5 sm:mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff6b6b]">
            YOUR COURSE
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 tracking-tight">
            {course.name}
          </h2>

          {/* Uploaded Count Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-[#8f8a8b] mt-3 select-none">
            {/* Red Camera Icon */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#ff4d4d]" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>
              <strong className="text-white font-bold">{videos.length}</strong> recordings uploaded
            </span>
          </div>
        </div>
      </section>

      {/* 2. FEATURED ACTIVE VIDEO PLAYER CARD */}
      <section ref={playerCardRef} className="mt-5">
        <div className="bg-[#1C1C1E]/95 border border-white/10 rounded-[8px] p-3 sm:p-5 shadow-xl relative">
          {/* 16:9 Video Container */}
          <div className="aspect-video w-full rounded-[8px] overflow-hidden bg-black relative border border-white/5 flex items-center justify-center">
            {playingVideo ? (
              playingVideo.processingStatus === "processing" ? (
                <div className="text-white flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <h3 className="text-base font-bold mb-1">Video is processing</h3>
                  <p className="text-xs text-white/50 max-w-xs">High-speed adaptive HLS stream is preparing. Please check back shortly.</p>
                </div>
              ) : urlLoading ? (
                <div className="text-white flex flex-col items-center justify-center p-6">
                  <div className="w-9 h-9 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs text-white/60">Loading stream...</p>
                </div>
              ) : playbackUrl ? (
                <div className="w-full h-full relative">
                  <VideoPlayer
                    src={playbackUrl}
                    isHls={playingVideo.hlsReady && playingVideo.storageProvider === "r2"}
                    poster={playingVideo.posterUrl || ""}
                    onDuration={handleVideoDuration}
                  />
                  {/* Subtle Security / Identification Watermark */}
                  <div className="pointer-events-none absolute bottom-12 right-4 z-20 text-[10px] text-white/20 uppercase tracking-widest font-mono font-bold select-none">
                    {studentIdentifier}
                  </div>
                </div>
              ) : (
                <div className="text-white/60 flex flex-col items-center justify-center p-6 text-center">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-white/20 mb-2" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                  <p className="text-xs">Preparing playback source...</p>
                </div>
              )
            ) : (
              <div className="text-white/60 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/30 mb-3">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">No Recording Selected</h3>
                <p className="text-xs text-white/40 max-w-xs">Pick a lesson below to start playing your classroom recording.</p>
              </div>
            )}
          </div>

          {/* Video Metadata & Description */}
          {playingVideo && (
            <div className="mt-4 px-1">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                {playingVideo.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#8f8a8b] font-medium mt-1">
                {formatDateFriendly(playingVideo.createdAt)} · {formatDurationFriendly(playingVideo.duration)} · Available until {formatExpiryFriendly(playingVideo.expiresAt, playingVideo.createdAt)}
              </p>
              <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
                {playingVideo.description || "Course lecture and practical lab session."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. LATEST UPLOADS SECTION (Horizontal Scroll Carousel) */}
      {videos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3.5">
            Latest uploads
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            {[...videos]
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
              .slice(0, 2)
              .map((video) => {
              const isNowPlaying = playingVideo?._id === video._id;

              return (
                <div
                  key={video._id}
                  className="min-w-0 bg-[#1C1C1E]/95 border border-white/10 rounded-[8px] p-3 flex flex-col justify-between hover:border-white/20 transition-all select-none"
                >
                  <div>
                    {/* Thumbnail: Grid overlay + Ambient glow + Play circle */}
                    <div
                      onClick={() => handlePlayVideo(video, true)}
                      className="aspect-video rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center cursor-pointer group"
                      style={{
                        background:
                          "radial-gradient(circle at 60% 40%, rgba(200, 30, 30, 0.35), transparent 70%), linear-gradient(180deg, #181214, #0d090a)",
                      }}
                    >
                      {/* Grid overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-40"
                        style={{
                          backgroundImage:
                            "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
                          backgroundSize: "16px 16px",
                        }}
                      />

                      {/* Play Button Icon */}
                      <div className="w-10 h-10 rounded-full bg-black/50 border border-white/30 backdrop-blur-md flex items-center justify-center text-white relative z-10 transition-transform group-hover:scale-110 shadow-lg">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Title & Metadata */}
                    <div className="mt-3">
                      <h4
                        onClick={() => handlePlayVideo(video, true)}
                        className="font-semibold text-white text-sm line-clamp-1 cursor-pointer hover:text-white/80"
                        title={video.title}
                      >
                        {video.title}
                      </h4>
                      <p className="text-xs text-[#8f8a8b] mt-1 flex items-center gap-1.5 font-medium">
                        <span>{formatDateFriendly(video.createdAt)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#8f8a8b]" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {formatDurationFriendly(video.duration)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Action Button: Now Playing (Red) or Watch Lesson */}
                  {isNowPlaying ? (
                    <button
                      disabled
                      className="w-full mt-3 py-2 px-3 rounded-xl bg-gradient-to-b from-[#ff2a2a] to-[#a3000a] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_16px_-2px_rgba(255,40,40,0.6)] cursor-default select-none"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Now playing</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlayVideo(video, true)}
                      className="w-full mt-3 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white/60" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Watch lesson</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. ALL RECORDINGS SECTION (Vertical List) */}
      <section className="mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3.5">
          All recordings
        </h2>

        {videos.length === 0 ? (
          <div className="bg-[#1C1C1E]/95 border border-white/10 rounded-[8px] p-8 text-center text-white/50">
            <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-white/20 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">No recordings uploaded for this course yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {videos.map((video) => {
              const isNowPlaying = playingVideo?._id === video._id;

              // Check expiry state
              const isExpired = video.expiresAt && new Date(video.expiresAt) < new Date();

              // Check upcoming state
              const isUpcoming = video.scheduledAt && new Date(video.scheduledAt) > new Date();

              return (
                <div
                  key={video._id}
                  onClick={() => {
                    if (!isExpired && !isUpcoming) {
                      handlePlayVideo(video, true);
                    }
                  }}
                  className={`rounded-[8px] p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all select-none ${
                    isNowPlaying
                      ? "bg-[#1C1C1E]/95 border border-[#ff2a2a]/70 shadow-[0_0_20px_rgba(255,42,42,0.18)] cursor-pointer"
                      : isExpired
                      ? "bg-[#1C1C1E]/60 border border-white/5 opacity-60 cursor-not-allowed"
                      : isUpcoming
                      ? "bg-[#1C1C1E]/80 border border-white/10 opacity-75 cursor-not-allowed"
                      : "bg-[#1C1C1E]/95 border border-white/10 hover:border-white/25 cursor-pointer"
                  }`}
                >
                  {/* Left: Thumbnail with grid texture + center icon */}
                  <div
                    className="w-24 sm:w-28 aspect-video rounded-xl relative overflow-hidden border border-white/5 shrink-0 flex items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(circle at 60% 40%, rgba(200, 30, 30, 0.3), transparent 70%), linear-gradient(180deg, #181214, #0d090a)",
                    }}
                  >
                    {/* Grid overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
                        backgroundSize: "14px 14px",
                      }}
                    />

                    {/* Status Centered Icon */}
                    {isExpired ? (
                      /* Slashed Eye / Eye-off Icon */
                      <div className="w-8 h-8 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/50 relative z-10">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      </div>
                    ) : isUpcoming ? (
                      /* Lock Icon */
                      <div className="w-8 h-8 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/60 relative z-10">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                      </div>
                    ) : (
                      /* Play Circle Icon */
                      <div className="w-8 h-8 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white relative z-10">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 ml-0.5" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Middle: Title, Meta, Status */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate" title={video.title}>
                      {video.title}
                    </h4>
                    <p className="text-xs text-[#8f8a8b] mt-0.5 font-medium">
                      {formatDateFriendly(video.createdAt)} · {formatDurationFriendly(video.duration)}
                    </p>

                    {/* Status badge line */}
                    {isNowPlaying && (
                      <span className="text-xs font-semibold text-[#ff4d4d] mt-1 inline-block">
                        Now playing
                      </span>
                    )}
                    {isExpired && (
                      <span className="text-xs font-semibold text-red-500 mt-1 inline-block">
                        Expired
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-xs font-medium text-white/40 mt-1 inline-block">
                        Available {formatDateFriendly(video.scheduledAt)}
                      </span>
                    )}
                  </div>

                  {/* Right: Circular Play Action Button (if not already now playing and not expired) */}
                  {!isNowPlaying && !isExpired && !isUpcoming && (
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center text-white shrink-0 hover:bg-white/10 hover:border-white/30 transition-all">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function StudentCoursePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-white/60 text-sm">Loading course...</p>
        </div>
      }
    >
      <StudentCourseDetailsContent />
    </Suspense>
  );
}
