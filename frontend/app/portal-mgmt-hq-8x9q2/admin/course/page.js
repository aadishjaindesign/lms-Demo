"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchApi, API_URL } from "@/lib/api";
import { istDateKey, addYearsToDateKey } from "@/lib/istDate";
import dynamic from "next/dynamic";
import { Suspense } from "react";
const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), { ssr: false });

function CourseDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [course, setCourse] = useState(null);
  
  const getOptimizedVideoUrl = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return url;
  };
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [assignNotice, setAssignNotice] = useState("");
  const [isEditVideoModalOpen, setIsEditVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState("");

  const handlePlayVideo = async (video) => {
    setPlayingVideo(video);
    if (video.hlsReady && video.storageProvider === 'r2') {
      // Use HLS route
      setPlaybackUrl(`${API_URL}/courses/${id}/videos/${video._id}/hls/master.m3u8`);
    } else if (video.storageProvider === 'r2') {
      try {
        const res = await fetchApi(`/courses/${id}/videos/${video._id}/playback-url`);
        if (res.ok) {
          const data = await res.json();
          setPlaybackUrl(data.url);
        } else {
          setError("Failed to get playback URL");
        }
      } catch (err) {
        setError(err.message);
      }
    } else {
      setPlaybackUrl(getOptimizedVideoUrl(video.secureUrl));
    }
  };

  const fetchCourseData = async () => {
    setLoading(true);
    setError("");
    try {
      const courseRes = await fetchApi(`/courses/${id}`);
      if (!courseRes.ok) throw new Error("Failed to fetch course details");
      const courseData = await courseRes.json();
      setCourse(courseData);

      const videoRes = await fetchApi(`/courses/${id}/videos`);
      if (videoRes.ok) {
        const videoData = await videoRes.json();
        setVideos(videoData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  // Sync playingVideo if videos array updates in the background
  useEffect(() => {
    if (playingVideo) {
      const updated = videos.find((v) => v._id === playingVideo._id);
      if (updated && updated.processingStatus !== playingVideo.processingStatus) {
        setPlayingVideo(updated);
        if (updated.hlsReady && updated.storageProvider === 'r2') {
          setPlaybackUrl(`${API_URL}/courses/${id}/videos/${updated._id}/hls/master.m3u8`);
        }
      }
    }
  }, [videos, playingVideo, id]);

  // Poll for processing videos every 5 seconds
  useEffect(() => {
    const hasProcessing = videos.some((v) => v.processingStatus === 'processing');
    if (!hasProcessing) return;

    const intervalId = setInterval(async () => {
      try {
        const videoRes = await fetchApi(`/courses/${id}/videos`);
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          setVideos(videoData);
        }
      } catch (err) {
        // silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [videos, id]);

  const handleDeleteVideo = async (videoId) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      const res = await fetchApi(`/videos/${videoId}`, { method: "DELETE" });
      if (res.ok) {
        fetchCourseData();
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-[#D71D3A] mb-4"></div>
        <p className="text-gray-400 font-medium text-sm">Loading course details...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
        <div className="w-16 h-16 bg-rose-950/60 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <p className="text-gray-400 font-medium mb-4">{error || "Course not found"}</p>
        <Link href="/portal-mgmt-hq-8x9q2/admin/courses/" className="text-rose-400 hover:underline font-semibold text-sm">&larr; Back to Courses</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto h-full text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/portal-mgmt-hq-8x9q2/admin/courses/" className="text-sm font-medium text-gray-400 hover:text-white mb-2 inline-flex items-center gap-1.5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Courses
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight break-words">{course.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{course.description || "Manage videos for this course"}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
        <button
          onClick={() => setIsRosterOpen(true)}
          className="w-full md:w-auto justify-center bg-white/10 hover:bg-white/15 border border-white/10 active:scale-95 text-white px-5 py-2.5 rounded-2xl transition-all font-semibold flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          View Students
        </button>
        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="w-full md:w-auto justify-center bg-white/10 hover:bg-white/15 border border-white/10 active:scale-95 text-white px-5 py-2.5 rounded-2xl transition-all font-semibold flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Assign Students
        </button>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full md:w-auto justify-center bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-95 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-red-950/60 transition-all font-semibold flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Upload Video
        </button>
        </div>
      </div>
      {assignNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold px-4 py-3 rounded-xl">{assignNotice}</div>
      )}

      <CourseAttendancePanel courseId={id} />

      {/* Videos List */}
      <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-5 sm:p-6 flex-1">
        <h2 className="text-lg font-bold text-white mb-5 border-b border-white/10 pb-4">
          Course Videos 
          <span className="text-gray-400 font-medium ml-1">({videos.length})</span>
        </h2>
        
        {videos.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No videos found</h3>
            <p className="text-gray-400 text-sm max-w-sm">Click &quot;Upload Video&quot; to add the first video for this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video, index) => {
              const thumbnailUrl = video.storageProvider === 'r2' 
                ? null 
                : (video.secureUrl ? video.secureUrl.replace(/\.[^/.]+$/, ".jpg") : "");
              
              return (
                <div key={video._id} className="bg-[#150204]/80 border border-white/10 rounded-2xl overflow-hidden shadow-sm hover:border-red-500/40 transition-all group">
                  <div 
                    className="relative aspect-video bg-black/60 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => handlePlayVideo(video)}
                  >
                    {video.storageProvider === 'r2' || !thumbnailUrl ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/80">
                        <svg className="w-14 h-14 text-gray-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                      </div>
                    ) : (
                      <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1 block">Lesson {index + 1}</span>
                        <h3 className="font-semibold text-white text-sm line-clamp-1">{video.title}</h3>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Uploaded: {new Date(video.createdAt || video.uploadedAt || Date.now()).toLocaleDateString()}</span>
                        {video.processingStatus === 'processing' ? (
                          <span className="flex items-center text-amber-400 text-xs mt-1">
                            <div className="w-2 h-2 bg-amber-400 rounded-full mr-1"></div>
                            Processing {video.processingProgress ? `(${video.processingProgress}%)` : ''}
                          </span>
                        ) : video.processingStatus === 'failed' ? (
                          <span className="text-rose-400 text-xs mt-1">Failed</span>
                        ) : null}
                        {video.expiresAt && (
                           <div className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md mt-2 inline-block">Expires: {new Date(video.expiresAt).toLocaleDateString()}</div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <button 
                          onClick={() => { setEditingVideo(video); setIsEditVideoModalOpen(true); }}
                          className="text-gray-400 hover:text-blue-500 p-1.5 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                          title="Edit video"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteVideo(video._id)}
                          className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                          title="Delete video"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isRosterOpen && (
        <CourseStudentsModal courseId={id} courseName={course.name} onClose={() => setIsRosterOpen(false)} />
      )}

      {isAssignModalOpen && (
        <AssignStudentsModal
          courseId={id}
          courseName={course.name}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={(msg) => { setIsAssignModalOpen(false); setAssignNotice(msg); }}
        />
      )}

      {isUploadModalOpen && (
        <UploadVideoModal 
          courseId={id} 
          onClose={() => setIsUploadModalOpen(false)} 
          onSuccess={() => { setIsUploadModalOpen(false); fetchCourseData(); }}
        />
      )}

      {isEditVideoModalOpen && editingVideo && (
        <EditVideoModal 
          video={editingVideo}
          onClose={() => { setIsEditVideoModalOpen(false); setEditingVideo(null); }}
          onSuccess={() => { setIsEditVideoModalOpen(false); setEditingVideo(null); fetchCourseData(); }}
        />
      )}

      {playingVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-black rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl relative flex flex-col">
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10">
              <button onClick={() => { setPlayingVideo(null); setPlaybackUrl(""); }} className="bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            {playingVideo.processingStatus === 'processing' ? (
              <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-gray-900 rounded-xl text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <h3 className="text-xl font-bold mb-2">Video is processing {playingVideo.processingProgress ? `(${playingVideo.processingProgress}%)` : ''}</h3>
                <p className="text-gray-400">Please wait while we prepare the video for streaming.</p>
              </div>
            ) : (
              <div className="w-full bg-black aspect-video relative flex items-center justify-center">
                <VideoPlayer 
                  src={playbackUrl} 
                  isHls={playingVideo.hlsReady && playingVideo.storageProvider === 'r2'}
                />
              </div>
            )}
            <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">{playingVideo.title}</h3>
              {playingVideo.expiresAt && (
                <span className="text-xs text-gray-400">Expires: {new Date(playingVideo.expiresAt).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reads the real length (seconds) of a local video file from its metadata.
const readVideoDuration = (file) =>
  new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      const done = (val) => { URL.revokeObjectURL(url); resolve(val); };
      v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration) : 0);
      v.onerror = () => done(0);
      setTimeout(() => done(0), 15000);
      v.src = url;
    } catch (e) {
      resolve(0);
    }
  });

export default function CourseDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading course details...</div>}>
      <CourseDetailsContent />
    </Suspense>
  );
}


function UploadVideoModal({ courseId, onClose, onSuccess }) {
  const [queue, setQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const abortControllerRef = useRef(null);
  const activeXhrs = useRef(new Set());
  const isCancelled = useRef(false);

  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  const isUploadingRef = useRef(isUploading);
  useEffect(() => { isUploadingRef.current = isUploading; }, [isUploading]);

  useEffect(() => {
    const saved = localStorage.getItem(`r2_upload_${courseId}`);
    if (saved) {
      localStorage.removeItem(`r2_upload_${courseId}`);
    }

    const handleBeforeUnload = (e) => {
      if (isUploadingRef.current) {
        e.preventDefault();
        e.returnValue = "Video upload is still in progress. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (isUploadingRef.current) {
        isCancelled.current = true;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        activeXhrs.current.forEach(xhr => xhr.abort());
        localStorage.removeItem(`r2_upload_${courseId}`);
      }
    };
  }, [courseId]);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const newItems = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      status: "WAITING",
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      timeRemaining: null,
      error: ""
    }));
    
    setQueue(prev => [...prev, ...newItems]);
    setGlobalError("");
    e.target.value = null; // reset input
  };

  const removeQueueItem = (id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };
  
  const updateQueueItem = (id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleCancel = () => {
    isCancelled.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    activeXhrs.current.forEach(xhr => xhr.abort());
    activeXhrs.current.clear();
    localStorage.removeItem(`r2_upload_${courseId}`);
    
    setQueue(prev => prev.map(item => {
      if (item.status === "WAITING" || item.status === "UPLOADING" || item.status === "PROCESSING") {
        return { ...item, status: "CANCELLED" };
      }
      return item;
    }));
    setIsUploading(false);
  };

  const attemptClose = () => {
    if (isUploading) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmCloseAndCancel = () => {
    handleCancel();
    onClose();
  };

  const processQueue = async () => {
    if (isUploadingRef.current) return;
    
    setIsUploading(true);
    isCancelled.current = false;
    abortControllerRef.current = new AbortController();
    
    const baseApiHost = API_URL.replace(/\/api\/?$/, "");
      
    const token = localStorage.getItem('token');
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let someCompleted = false;

    for (let i = 0; i < queueRef.current.length; i++) {
      if (isCancelled.current) break;
      
      const item = queueRef.current[i];
      if (item.status !== "WAITING") continue;
      
      updateQueueItem(item.id, { status: "UPLOADING", error: "" });
      
      try {
        const initRes = await fetch(`${baseApiHost}/api/videos/presigned-url`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            courseId,
            fileName: item.file.name,
            fileType: item.file.type || "video/mp4",
            title: item.title.trim() || item.file.name,
            size: item.file.size
          }),
          signal: abortControllerRef.current.signal
        });
        if (!initRes.ok) throw new Error("Failed to get upload URL");
        
        const { uploadUrl, objectKey, videoId } = await initRes.json();
        
        if (isCancelled.current) throw new Error("Upload cancelled");
        
        let lastUpdateTime = 0;
        let lastLoaded = 0;
        
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXhrs.current.add(xhr);
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", item.file.type || "video/mp4");
          
          xhr.upload.onprogress = (event) => {
            if (isCancelled.current) {
              xhr.abort();
              return;
            }
            if (event.lengthComputable) {
              const now = Date.now();
              if (now - lastUpdateTime > 250) {
                const diffBytes = event.loaded - lastLoaded;
                const diffTime = (now - lastUpdateTime) / 1000;
                const speed = diffTime > 0 ? diffBytes / diffTime : 0;
                
                lastUpdateTime = now;
                lastLoaded = event.loaded;
                
                const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
                const remainingBytes = Math.max(0, event.total - event.loaded);
                const etaSeconds = speed > 0 ? remainingBytes / speed : 0;
                
                updateQueueItem(item.id, {
                  uploadedBytes: event.loaded,
                  progress,
                  speed,
                  timeRemaining: etaSeconds
                });
              }
            }
          };
          
          xhr.onload = () => {
            activeXhrs.current.delete(xhr);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`HTTP ${xhr.status} ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = () => {
            activeXhrs.current.delete(xhr);
            reject(new Error("Network error"));
          };
          
          xhr.onabort = () => {
            activeXhrs.current.delete(xhr);
            reject(new Error("Upload cancelled"));
          };
          
          xhr.send(item.file);
        });
        
        if (isCancelled.current) throw new Error("Upload cancelled");
        
        updateQueueItem(item.id, {
          uploadedBytes: item.file.size,
          progress: 100,
          timeRemaining: 0,
          status: "PROCESSING"
        });
        
        const saveRes = await fetch(`${baseApiHost}/api/videos/upload-complete`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ videoId, objectKey, duration: await readVideoDuration(item.file) }),
          signal: abortControllerRef.current.signal
        });

        if (!saveRes.ok) {
          const errorData = await saveRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to save video metadata");
        }
        
        updateQueueItem(item.id, { status: "COMPLETED" });
        someCompleted = true;
        
      } catch (err) {
        if (isCancelled.current || err.message === "Upload cancelled" || err.name === 'AbortError') {
           updateQueueItem(item.id, { status: "CANCELLED" });
        } else {
           console.error(err);
           updateQueueItem(item.id, { status: "FAILED", error: err.message || "An unexpected error occurred" });
        }
      }
    }
    
    setIsUploading(false);
    if (someCompleted) {
      onSuccess();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (queue.length === 0) {
      setGlobalError("Please select at least one video file");
      return;
    }
    if (queue.some(q => !q.title.trim())) {
      setGlobalError("Please provide a title for all videos");
      return;
    }
    
    setGlobalError("");
    processQueue();
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return "Calculating...";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col text-white">
        {showConfirmClose && (
          <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8 text-center flex-col backdrop-blur-md rounded-3xl">
             <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mb-4">
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             </div>
             <h3 className="text-lg font-bold text-white mb-2">Cancel video upload?</h3>
             <p className="text-gray-400 text-sm mb-6">The current upload queue will be aborted and you will lose your progress.</p>
             <div className="flex flex-col md:flex-row gap-3 w-full max-w-sm mx-auto">
               <button onClick={() => setShowConfirmClose(false)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-gray-300 font-semibold hover:bg-white/10 transition-colors text-sm">
                 Continue Upload
               </button>
               <button onClick={confirmCloseAndCancel} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D71D3A] to-[#BA142D] text-white font-semibold hover:brightness-110 transition-all text-sm shadow-lg shadow-red-950/60">
                 Cancel Upload
               </button>
             </div>
          </div>
        )}

        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0 bg-black/40">
          <h2 className="text-lg font-bold text-white">Upload Videos</h2>
          <button onClick={attemptClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            {globalError && <div className="mb-4 text-xs font-semibold text-rose-300 bg-rose-950/60 p-3 rounded-xl border border-rose-500/30">{globalError}</div>}
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Video Files *</label>
              <div className={`border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden bg-black/30`}>
                <input 
                  type="file" multiple accept="video/mp4,video/x-m4v,video/*"
                  onChange={handleFilesSelected}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <svg className="w-7 h-7 mx-auto mb-2 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                <div className="text-sm font-semibold text-white">
                  Click to browse or drag video files here
                </div>
                <div className="text-xs text-gray-400 mt-1">MP4, WebM, MOV (Multiple files supported)</div>
              </div>
            </div>

            {queue.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-300 border-b border-white/10 pb-2">Upload Queue ({queue.length})</h3>
                {queue.map((item, index) => (
                  <div key={item.id} className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
                    {(item.status === "UPLOADING" || item.status === "PROCESSING" || item.status === "COMPLETED") && item.progress > 0 && (
                      <div 
                        className={`absolute bottom-0 left-0 h-1 transition-all duration-300 ${item.status === "FAILED" ? "bg-rose-500" : item.status === "COMPLETED" ? "bg-emerald-500" : "bg-[#D71D3A]"}`} 
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    )}
                    
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Video Title</label>
                        <input 
                          type="text" required
                          value={item.title} onChange={e => updateQueueItem(item.id, { title: e.target.value })}
                          disabled={item.status !== "WAITING" && item.status !== "FAILED" && item.status !== "CANCELLED"}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:outline-none text-sm text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Video title"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeQueueItem(item.id)}
                        disabled={item.status === "UPLOADING" || item.status === "PROCESSING"}
                        className="mt-5 text-gray-400 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-xs font-semibold text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>
                          {item.status === "WAITING" && "Waiting in queue..."}
                          {item.status === "UPLOADING" && "Uploading to R2..."}
                          {item.status === "PROCESSING" && "Saving metadata..."}
                          {item.status === "COMPLETED" && "Upload complete!"}
                          {item.status === "FAILED" && "Upload failed"}
                          {item.status === "CANCELLED" && "Upload cancelled"}
                        </span>
                        {(item.status === "UPLOADING" || item.status === "PROCESSING" || item.status === "COMPLETED") && (
                          <span className={item.status === "COMPLETED" ? "text-emerald-400" : "text-rose-400"}>{item.progress}%</span>
                        )}
                      </div>
                      
                      {item.error && (
                        <div className="text-rose-400 text-[11px] mt-0.5">{item.error}</div>
                      )}

                      {item.status === "UPLOADING" && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between text-gray-500 mt-1">
                          <span>{formatBytes(item.uploadedBytes)} / {formatBytes(item.file.size)}</span>
                          <span>{formatBytes(item.speed)}/s • ETA: {formatTime(item.timeRemaining)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-black/40">
            <button 
              type="button" 
              onClick={attemptClose} 
              className="px-5 py-2.5 text-gray-400 font-medium hover:text-white hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50 text-sm"
            >
              {isUploading ? "Cancel All" : "Close"}
            </button>
            <button 
              type="submit" 
              disabled={isUploading || queue.length === 0 || queue.every(q => q.status === "COMPLETED" || q.status === "PROCESSING")} 
              className="px-5 py-2.5 bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-red-950/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : "Start Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditVideoModal({ video, onClose, onSuccess }) {
  const [title, setTitle] = useState(video?.title || "");
  const [description, setDescription] = useState(video?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetchApi(`/videos/${video._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Failed to update video");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-white">
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-lg font-bold text-white">Edit Video</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && <div className="mb-4 text-xs font-semibold text-rose-300 bg-rose-950/60 p-3 rounded-xl border border-rose-500/30">{error}</div>}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Video Title *</label>
            <input 
              type="text" required
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:outline-none text-sm text-white placeholder-gray-500"
              placeholder="Enter video title"
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
            <textarea 
              rows="4"
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:outline-none text-sm text-white placeholder-gray-500 resize-none"
              placeholder="Brief description of the video"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-95 text-white rounded-xl shadow-lg shadow-red-950/60 transition-all disabled:opacity-50 font-semibold text-sm">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function AssignStudentsModal({ courseId, courseName, onClose, onSuccess }) {
  const today = istDateKey();
  const nextYear = addYearsToDateKey(today, 1);

  const [students, setStudents] = useState([]);
  const [alreadyIds, setAlreadyIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [startDate, setStartDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState(nextYear);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [sRes, aRes] = await Promise.all([
          fetchApi("/students"),
          fetchApi(`/students/course-access-ids/${courseId}`),
        ]);
        if (sRes.ok) {
          const data = await sRes.json();
          setStudents(Array.isArray(data) ? data : []);
        }
        if (aRes.ok) setAlreadyIds(new Set((await aRes.json()).studentIds || []));
      } catch (e) {
        setError("Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const q = search.trim().toLowerCase();
  const filtered = students.filter(
    (s) => !q || [s.name, s.phone, s.studentId].some((v) => String(v || "").toLowerCase().includes(q))
  );
  const selectable = filtered.filter((s) => !alreadyIds.has(s._id));
  const allSelected = selectable.length > 0 && selectable.every((s) => selected.has(s._id));

  const toggle = (sid) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      selectable.forEach((s) => (allSelected ? next.delete(s._id) : next.add(s._id)));
      return next;
    });

  const handleAssign = async () => {
    setError("");
    if (selected.size === 0) return setError("Select at least one student");
    if (new Date(startDate) >= new Date(expiryDate)) return setError("Expiry date must be after start date");
    setSaving(true);
    try {
      const res = await fetchApi("/students/bulk-course-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentIds: [...selected], startDate, expiryDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to assign students");
      onSuccess(`${data.assigned} student(s) assigned to ${courseName}${data.skipped ? ` (${data.skipped} already had access)` : ""}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/40";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div>
            <h2 className="text-lg font-bold">Assign Students</h2>
            <p className="text-xs text-gray-400">{courseName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone or ID..." className={inputCls} />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-red-600" />
              Select all ({selectable.length})
            </label>
            <span className="font-semibold text-white">{selected.size} selected</span>
          </div>

          <div className="border border-white/10 rounded-xl divide-y divide-white/5 max-h-72 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Loading students...</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No students found.</p>
            ) : (
              filtered.map((s) => {
                const has = alreadyIds.has(s._id);
                return (
                  <label key={s._id} className={`flex items-center gap-3 px-3 py-2.5 ${has ? "opacity-50" : "cursor-pointer hover:bg-white/5"}`}>
                    <input type="checkbox" disabled={has} checked={has || selected.has(s._id)} onChange={() => toggle(s._id)} className="w-4 h-4 accent-red-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-[11px] text-gray-400">{s.studentId} · {s.phone}</p>
                    </div>
                    {has && <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">Assigned</span>}
                  </label>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Expiry date</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          {error && <p className="text-sm text-red-400 font-semibold">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-2 bg-black/40">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold">Cancel</button>
          <button onClick={handleAssign} disabled={saving || selected.size === 0} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D71D3A] to-[#BA142D] disabled:opacity-50 text-sm font-semibold">
            {saving ? "Assigning..." : `Assign ${selected.size || ""} Student${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}


const todayIST = () => {
  // en-CA gives YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

function CourseAttendancePanel({ courseId }) {
  const [date, setDate] = useState(todayIST());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("notMarked");

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchApi(`/students/course-attendance/${courseId}?date=${date}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || body.message || `Failed to load attendance (HTTP ${res.status})`);
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled) { setError(e.message); setData(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, date]);

  const total = data?.total || 0;
  const markedCount = data?.markedCount || 0;
  const pct = total ? Math.round((markedCount / total) * 100) : 0;
  const rows = data ? (tab === "marked" ? data.marked : data.notMarked) : [];
  const statusCls = {
    present: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    late: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    holiday: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  };

  return (
    <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-white">Attendance</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayIST()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark]"
          />
          {date !== todayIST() && (
            <button onClick={() => setDate(todayIST())} className="text-xs font-semibold text-gray-300 hover:text-white px-3 py-2 rounded-xl bg-white/5 border border-white/10">Today</button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading attendance...</p>
      ) : error ? (
        <p className="text-sm text-red-400 font-semibold">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total students</p>
              <p className="text-2xl font-extrabold mt-0.5">{total}</p>
            </div>
            <button onClick={() => setTab("marked")} className={`text-left rounded-xl px-4 py-3 border transition-colors ${tab === "marked" ? "bg-emerald-500/10 border-emerald-500/40" : "bg-black/30 border-white/10 hover:border-emerald-500/30"}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Marked</p>
              <p className="text-2xl font-extrabold mt-0.5">{markedCount} <span className="text-sm font-semibold text-gray-400">({pct}%)</span></p>
            </button>
            <button onClick={() => setTab("notMarked")} className={`text-left rounded-xl px-4 py-3 border transition-colors ${tab === "notMarked" ? "bg-red-500/10 border-red-500/40" : "bg-black/30 border-white/10 hover:border-red-500/30"}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">Not marked</p>
              <p className="text-2xl font-extrabold mt-0.5">{data?.notMarkedCount || 0}</p>
            </button>
          </div>

          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-4">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>

          {total === 0 ? (
            <p className="text-sm text-gray-400">No active students are assigned to this course.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400">{tab === "marked" ? "No one has marked attendance yet for this day." : "Everyone has marked attendance for this day."}</p>
          ) : (
            <div className="border border-white/10 rounded-xl divide-y divide-white/5 max-h-80 overflow-y-auto">
              {rows.map((s, i) => (
                <div key={s._id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-gray-500 w-5 text-right">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    <p className="text-[11px] text-gray-400">{s.studentId} · {s.phone}</p>
                  </div>
                  {tab === "marked" ? (
                    <div className="text-right">
                      <span className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${statusCls[s.status] || statusCls.present}`}>{s.status}</span>
                      <p className="text-[11px] text-gray-400 mt-1">
                        In {s.checkIn || "—"}{s.checkOut ? ` · Out ${s.checkOut}` : ""}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 text-red-400 border-red-500/30 bg-red-500/10">{s.status === "absent" ? "Absent" : "Not marked"}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CourseStudentsModal({ courseId, courseName, onClose }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const handleRemove = async (s) => {
    if (!window.confirm(`Remove ${s.name} from ${courseName}? They will lose access to this course.`)) return;
    setError("");
    setRemovingId(s._id);
    try {
      const res = await fetchApi(`/students/course-students/${courseId}/${s._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 404 without a JSON error = the live backend doesn't have this route yet (needs redeploy)
        throw new Error(data.error || data.message || `Failed to remove student (HTTP ${res.status})`);
      }
      setList((prev) => prev.filter((x) => String(x._id) !== String(s._id)));
    } catch (e) {
      setError(e.message);
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi(`/students/course-students/${courseId}`);
        if (!res.ok) throw new Error("Failed to load students");
        setList(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const q = search.trim().toLowerCase();
  const filtered = list.filter((s) => !q || [s.name, s.phone, s.studentId].some((v) => String(v || "").toLowerCase().includes(q)));
  const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const badge = {
    active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    expired: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    revoked: "text-red-400 border-red-500/30 bg-red-500/10",
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div>
            <h2 className="text-lg font-bold">Course Students <span className="text-gray-400 font-medium">({list.length})</span></h2>
            <p className="text-xs text-gray-400">{courseName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone or ID..." className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/40" />
          {error && <p className="text-sm text-red-400 font-semibold">{error}</p>}
          <div className="border border-white/10 rounded-xl divide-y divide-white/5">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Loading students...</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">{list.length === 0 ? "No students are assigned to this course yet." : "No students found."}</p>
            ) : (
              filtered.map((s, i) => (
                <div key={s.accessId} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-6 text-xs text-gray-500 text-right">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    <p className="text-[11px] text-gray-400">{s.studentId} · {s.phone}</p>
                    <p className="text-[11px] text-gray-500">{s.startDate && s.expiryDate ? `${fmt(s.startDate)} → ${fmt(s.expiryDate)}` : "No expiry set"}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${badge[s.accessStatus]}`}>{s.accessStatus}</span>
                  <button
                    onClick={() => handleRemove(s)}
                    disabled={removingId === s._id}
                    title="Remove from course"
                    className="text-[11px] font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 rounded-lg px-2.5 py-1"
                  >
                    {removingId === s._id ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 bg-black/40">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold">Close</button>
        </div>
      </div>
    </div>
  );
}
