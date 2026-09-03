"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchApi, API_URL } from "@/lib/api";

export default function CourseDetailsPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  
  const getOptimizedVideoUrl = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      // Apply automatic format (f_auto) and quality (q_auto) selection to speed up delivery
      return url.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return url;
  };
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState("");

  const handlePlayVideo = async (video) => {
    setPlayingVideo(video);
    if (video.storageProvider === 'r2') {
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
      // Fetch course details
      const courseRes = await fetchApi(`/courses/${id}`);
      if (!courseRes.ok) throw new Error("Failed to fetch course details");
      const courseData = await courseRes.json();
      setCourse(courseData);

      // Fetch videos for this course
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

  const handleDeleteVideo = async (videoId) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      const res = await fetchApi(`/videos/${videoId}`, { method: "DELETE" });
      if (res.ok) {
        fetchCourseData(); // Refresh list
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500 text-lg">Loading course details...</div>;
  }

  if (error || !course) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block font-medium">
          {error || "Course not found"}
        </div>
        <div className="mt-4">
          <Link href="/admin/courses" className="text-[#c71e22] hover:underline font-medium">&larr; Back to Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <Link href="/admin/courses" className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-2 inline-flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Courses
          </Link>
          <h1 className="text-2xl md:text-[32px] font-bold text-gray-900 leading-tight break-words">{course.name}</h1>
          <p className="text-gray-500 text-sm">{course.description || "Manage videos for this course"}</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full md:w-auto justify-center bg-[#c71e22] hover:bg-[#a5191c] text-white px-6 py-2.5 rounded-xl shadow-sm transition-colors font-semibold flex items-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Upload Video
        </button>
      </div>

      {/* Videos List */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4 md:p-8 flex-1">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-6 border-b border-gray-100 pb-4">Course Videos ({videos.length})</h2>
        
        {videos.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No videos found</h3>
            <p className="text-gray-500 text-sm max-w-sm">Click the "Upload Video" button to add the first video for this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => {
              // Use dummy thumbnail for R2 or Cloudinary thumbnail
              const thumbnailUrl = video.storageProvider === 'r2' 
                ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='5 3 19 12 5 21 5 3'%3E%3C/polygon%3E%3C/svg%3E" 
                : (video.secureUrl ? video.secureUrl.replace(/\.[^/.]+$/, ".jpg") : "");
              
              return (
                <div key={video._id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                  <div 
                    className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => handlePlayVideo(video)}
                  >
                    {video.storageProvider === 'r2' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <svg className="w-16 h-16 text-gray-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                      </div>
                    ) : (
                      <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-[#c71e22] mb-1 block">Lesson {index + 1}</span>
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{video.title}</h3>
                        {video.expiresAt && (
                           <div className="text-xs text-orange-500 mt-1">Expires: {new Date(video.expiresAt).toLocaleDateString()}</div>
                        )}
                      </div>
                      <button 
                        onClick={() => handleDeleteVideo(video._id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Delete video"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isUploadModalOpen && (
        <UploadVideoModal 
          courseId={id} 
          onClose={() => setIsUploadModalOpen(false)} 
          onSuccess={() => { setIsUploadModalOpen(false); fetchCourseData(); }}
        />
      )}

      {playingVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-black rounded-xl overflow-hidden w-full max-w-4xl shadow-2xl relative flex flex-col">
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10">
              <button onClick={() => setPlayingVideo(null)} className="bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <video 
              src={playbackUrl} 
              controls 
              autoPlay 
              className="w-full max-h-[80vh] bg-black"
            >
              Your browser does not support the video tag.
            </video>
            <div className="p-4 bg-gray-900 text-white flex justify-between">
              <h3 className="font-bold text-lg">{playingVideo.title}</h3>
              {playingVideo.expiresAt && (
                <span className="text-sm text-gray-400">Expires: {new Date(playingVideo.expiresAt).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function UploadVideoModal({ courseId, onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("SELECTED"); // SELECTED, UPLOADING, PROCESSING, COMPLETED, FAILED, CANCELLED
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const activeXhrs = useRef(new Set());
  const isCancelled = useRef(false);
  const uploadInfo = useRef(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    // On mount, check if there's an abandoned upload and clean it up
    const saved = localStorage.getItem(`r2_upload_${courseId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.uploadId && parsed.objectKey) {
           fetchApi(`/courses/${courseId}/videos/multipart-upload/abort`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ uploadId: parsed.uploadId, objectKey: parsed.objectKey })
           }).catch(() => {});
        }
      } catch (e) {}
      localStorage.removeItem(`r2_upload_${courseId}`);
    }

    const handleBeforeUnload = (e) => {
      if (statusRef.current === "UPLOADING" || statusRef.current === "PROCESSING") {
        e.preventDefault();
        e.returnValue = "Video upload is still in progress. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Unmount safety
      if (statusRef.current === "UPLOADING" || statusRef.current === "PROCESSING") {
        isCancelled.current = true;
        activeXhrs.current.forEach(xhr => xhr.abort());
        if (uploadInfo.current) {
          fetchApi(`/courses/${courseId}/videos/multipart-upload/abort`, {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(uploadInfo.current)
          }).catch(() => {});
          localStorage.removeItem(`r2_upload_${courseId}`);
        }
      }
    };
  }, [courseId]);

  const handleCancel = () => {
    isCancelled.current = true;
    setStatus("CANCELLED");
    activeXhrs.current.forEach(xhr => xhr.abort());
    activeXhrs.current.clear();
    if (uploadInfo.current) {
       fetchApi(`/courses/${courseId}/videos/multipart-upload/abort`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(uploadInfo.current)
       }).catch(() => {});
       localStorage.removeItem(`r2_upload_${courseId}`);
    }
  };

  const attemptClose = () => {
    if (status === "UPLOADING" || status === "PROCESSING") {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmCloseAndCancel = () => {
    handleCancel();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file");
      return;
    }

    setStatus("UPLOADING");
    setError("");
    setUploadProgress(0);
    setUploadedBytes(0);
    setUploadSpeed(0);
    setTimeRemaining(null);
    isCancelled.current = false;
    uploadInfo.current = null;
    activeXhrs.current.clear();

    const startTime = Date.now();

    try {
      // 1. Initiate Multipart Upload
      const minChunkSize = 5 * 1024 * 1024; // 5 MB
      const totalSize = file.size;
      const chunkSize = minChunkSize; 
      
      const totalParts = Math.ceil(totalSize / chunkSize);

      const initRes = await fetchApi(`/courses/${courseId}/videos/multipart-upload/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, parts: totalParts }),
      });
      if (!initRes.ok) throw new Error("Failed to initiate upload");
      
      const { uploadId, objectKey, presignedUrls } = await initRes.json();
      uploadInfo.current = { uploadId, objectKey };
      
      // Save state for refresh cleanup
      localStorage.setItem(`r2_upload_${courseId}`, JSON.stringify({ uploadId, objectKey }));
      
      if (isCancelled.current) throw new Error("Upload cancelled");

      const uploadedParts = [];
      const partsToUpload = [...presignedUrls];
      
      let currentTotalBytes = 0;
      let lastUpdateTime = 0;
      
      const uploadPart = async (partInfo) => {
        const { partNumber, url } = partInfo;
        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);
        
        let chunkRetries = 0;
        let chunkSuccess = false;
        
        while (!chunkSuccess && chunkRetries < 3) {
          if (isCancelled.current) throw new Error("Upload cancelled");
          try {
            await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              activeXhrs.current.add(xhr);
              xhr.open("PUT", url);
              
              let loadedRef = 0;
              xhr.upload.onprogress = (event) => {
                if (isCancelled.current) {
                  xhr.abort();
                  return;
                }
                if (event.lengthComputable) {
                  const diff = event.loaded - loadedRef;
                  loadedRef = event.loaded;
                  currentTotalBytes += diff;
                  
                  const now = Date.now();
                  if (now - lastUpdateTime > 250) {
                    lastUpdateTime = now;
                    const elapsedSeconds = (now - startTime) / 1000;
                    const currentAvgSpeed = elapsedSeconds > 0 ? currentTotalBytes / elapsedSeconds : 0;
                    const remainingBytes = Math.max(0, totalSize - currentTotalBytes);
                    const etaSeconds = currentAvgSpeed > 0 ? remainingBytes / currentAvgSpeed : 0;
                    
                    setUploadedBytes(currentTotalBytes);
                    setUploadProgress(Math.min(100, Math.round((currentTotalBytes / totalSize) * 100)));
                    setUploadSpeed(currentAvgSpeed);
                    setTimeRemaining(etaSeconds);
                  }
                }
              };
              
              xhr.onload = () => {
                activeXhrs.current.delete(xhr);
                if (xhr.status >= 200 && xhr.status < 300) {
                  const etag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag");
                  if(etag) {
                      uploadedParts.push({ ETag: etag.replace(/"/g, ""), PartNumber: partNumber });
                      resolve();
                  } else {
                      reject(new Error("Missing ETag in response"));
                  }
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
              xhr.send(chunk);
            });
            chunkSuccess = true;
          } catch (err) {
             if (err.message === "Upload cancelled") throw err;
             chunkRetries++;
             if (chunkRetries >= 3) {
               throw err;
             }
             await new Promise(r => setTimeout(r, 2000));
          }
        }
      };

      const concurrency = 6;
      let currentIndex = 0;
      const executing = [];
      
      const enqueue = async () => {
         while (currentIndex < partsToUpload.length) {
            if (isCancelled.current) throw new Error("Upload cancelled");
            const partInfo = partsToUpload[currentIndex++];
            const p = uploadPart(partInfo);
            executing.push(p);
            
            try {
               await p;
            } catch (err) {
               // Rethrow to break the enqueue loop
               throw err;
            } finally {
               const idx = executing.indexOf(p);
               if (idx !== -1) executing.splice(idx, 1);
            }
         }
      };
      
      const workers = [];
      for (let i = 0; i < Math.min(concurrency, partsToUpload.length); i++) {
         workers.push(enqueue());
      }
      
      // Wait for all workers to finish. If one throws, it rejects immediately.
      await Promise.all(workers);

      if (isCancelled.current) throw new Error("Upload cancelled");

      // Final UI update
      setUploadedBytes(totalSize);
      setUploadProgress(100);
      setUploadSpeed(totalSize / ((Date.now() - startTime) / 1000));
      setTimeRemaining(0);

      setStatus("PROCESSING");
      
      uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

      // Complete Multipart Upload
      const saveRes = await fetchApi(`/courses/${courseId}/videos/multipart-upload/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          objectKey,
          parts: uploadedParts,
          title,
          description: "",
          size: totalSize,
          mimeType: file.type,
          originalName: file.name
        }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save video metadata");
      }

      localStorage.removeItem(`r2_upload_${courseId}`);
      setStatus("COMPLETED");
      setTimeout(() => {
        onSuccess();
      }, 1000);
      
    } catch (err) {
      if (isCancelled.current || err.message === "Upload cancelled") {
         setStatus("CANCELLED");
         // The actual abort is handled in handleCancel or cleanup hook
      } else {
         console.error(err);
         setError(err.message || "An unexpected error occurred during upload");
         setStatus("FAILED");
      }
    }
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        {showConfirmClose && (
          <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center p-8 text-center flex-col backdrop-blur-sm">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel video upload?</h3>
             <p className="text-gray-500 mb-8">The current upload will be aborted and you will lose your progress.</p>
             <div className="flex flex-col md:flex-row gap-3 w-full">
               <button onClick={() => setShowConfirmClose(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                 Continue Upload
               </button>
               <button onClick={confirmCloseAndCancel} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">
                 Cancel Upload
               </button>
             </div>
          </div>
        )}

        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Upload Video</h2>
          <button onClick={attemptClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium border border-red-100">{error}</div>}
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Video Title</label>
            <input 
              type="text" required
              value={title} onChange={e => setTitle(e.target.value)}
              disabled={status === "UPLOADING" || status === "PROCESSING" || status === "COMPLETED"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#c71e22] focus:border-[#c71e22] focus:outline-none transition-shadow disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., Introduction to Module 1"
            />
          </div>
          
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Video File</label>
            <div className={`border-2 border-dashed ${file ? 'border-[#c71e22] bg-red-50' : 'border-gray-300'} rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative overflow-hidden`}>
              <input 
                type="file" required accept="video/mp4,video/x-m4v,video/*"
                onChange={e => {
                    setFile(e.target.files[0]);
                    setStatus("SELECTED");
                    setError("");
                }}
                disabled={status === "UPLOADING" || status === "PROCESSING" || status === "COMPLETED"}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              
              {(status === "UPLOADING" || status === "PROCESSING" || status === "COMPLETED") && uploadProgress > 0 && (
                <div 
                  className={`absolute bottom-0 left-0 h-1 transition-all duration-300 ${status === "FAILED" ? "bg-red-500" : status === "COMPLETED" ? "bg-green-500" : "bg-[#c71e22]"}`} 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              )}
              
              <svg className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-[#c71e22]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <div className={`text-sm font-medium ${file ? 'text-gray-900' : 'text-[#c71e22]'}`}>
                {file ? "Video Selected" : "Click to browse"}
              </div>
              <div className="text-xs text-gray-500 mt-1">{file ? file.name : "MP4, WebM, MOV"}</div>
            </div>
            
            {(status === "UPLOADING" || status === "PROCESSING" || status === "COMPLETED" || status === "FAILED" || status === "CANCELLED") && uploadProgress > 0 && (
              <div className="mt-3 flex flex-col gap-2 text-xs font-semibold text-gray-600">
                <div className="flex items-center justify-between">
                  <span>
                    {status === "UPLOADING" && "Uploading to R2..."}
                    {status === "PROCESSING" && "Saving metadata..."}
                    {status === "COMPLETED" && "Upload complete!"}
                    {status === "FAILED" && "Upload failed"}
                    {status === "CANCELLED" && "Upload cancelled"}
                  </span>
                  <span className={status === "COMPLETED" ? "text-green-600" : (status === "FAILED" || status === "CANCELLED") ? "text-red-600" : "text-[#c71e22]"}>{uploadProgress}%</span>
                </div>
                {status === "UPLOADING" && file && (
                   <div className="flex flex-col md:flex-row md:items-center justify-between text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100 gap-2 md:gap-0">
                     <div className="flex flex-col gap-1">
                        <span>Size: {formatBytes(uploadedBytes)} / {formatBytes(file.size)}</span>
                        <span>Speed: {formatBytes(uploadSpeed)}/s</span>
                     </div>
                     <div className="flex flex-col gap-1 md:text-right">
                        <span>ETA: {formatTime(timeRemaining)}</span>
                     </div>
                   </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <button 
              type="button" 
              onClick={attemptClose} 
              disabled={status === "PROCESSING"} 
              className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 flex-1 text-center min-w-[120px]"
            >
              {status === "UPLOADING" ? "Cancel Upload" : "Close"}
            </button>
            <button 
              type="submit" 
              disabled={status === "UPLOADING" || status === "PROCESSING" || status === "COMPLETED" || status === "CANCELLED" || !file || !title} 
              className="px-6 py-2.5 bg-[#c71e22] text-white font-semibold rounded-xl hover:bg-[#a5191c] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 min-w-[120px]"
            >
              {(status === "UPLOADING" || status === "PROCESSING") ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {status === "UPLOADING" ? "Uploading..." : "Processing..."}
                </>
              ) : status === "COMPLETED" ? "Success!" : "Upload Video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
