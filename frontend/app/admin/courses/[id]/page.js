"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchApi, API_URL } from "@/lib/api";

export default function CourseDetailsPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);

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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <Link href="/admin/courses" className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-2 inline-flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Courses
          </Link>
          <h1 className="text-[32px] font-bold text-gray-900 leading-tight">{course.name}</h1>
          <p className="text-gray-500 text-sm">{course.description || "Manage videos for this course"}</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-[#c71e22] hover:bg-[#a5191c] text-white px-6 py-2.5 rounded-xl shadow-sm transition-colors font-semibold flex items-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Upload Video
        </button>
      </div>

      {/* Videos List */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-8 flex-1">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b border-gray-100 pb-4">Course Videos ({videos.length})</h2>
        
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
              // Convert .mp4 to .jpg for Cloudinary thumbnail
              const thumbnailUrl = video.secureUrl.replace(/\.[^/.]+$/, ".jpg");
              
              return (
                <div key={video._id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                  <div 
                    className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => setPlayingVideo(video)}
                  >
                    <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-black rounded-xl overflow-hidden w-full max-w-4xl shadow-2xl relative flex flex-col">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setPlayingVideo(null)} className="bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <video 
              controls 
              autoPlay 
              className="w-full max-h-[80vh] bg-black"
              src={playingVideo.secureUrl}
            >
              Your browser does not support the video tag.
            </video>
            <div className="p-4 bg-gray-900 text-white">
              <h3 className="font-bold text-lg">{playingVideo.title}</h3>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("video", file);

    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setLoading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess();
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.error || "Failed to upload video");
        } catch {
          setError("Failed to upload video");
        }
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      setError("An unexpected error occurred during upload");
    };

    xhr.open("POST", `${API_URL}/courses/${courseId}/videos`);
    xhr.withCredentials = true; // IMPORTANT for cookies (auth)
    xhr.send(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Upload Video</h2>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition-colors">
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
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#c71e22] focus:border-[#c71e22] focus:outline-none transition-shadow"
              placeholder="e.g., Introduction to Module 1"
            />
          </div>
          
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Video File</label>
            <div className={`border-2 border-dashed ${file ? 'border-[#c71e22] bg-red-50' : 'border-gray-300'} rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative overflow-hidden`}>
              <input 
                type="file" required accept="video/mp4,video/x-m4v,video/*"
                onChange={e => setFile(e.target.files[0])}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              
              {loading && uploadProgress > 0 && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-[#c71e22] transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              )}
              
              <svg className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-[#c71e22]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <div className={`text-sm font-medium ${file ? 'text-gray-900' : 'text-[#c71e22]'}`}>
                {file ? "Video Selected" : "Click to browse"}
              </div>
              <div className="text-xs text-gray-500 mt-1">{file ? file.name : "MP4, WebM, MOV"}</div>
            </div>
            
            {loading && uploadProgress > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-gray-600">
                <span>Uploading to Cloudinary...</span>
                <span className="text-[#c71e22]">{uploadProgress}%</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#c71e22] text-white font-semibold rounded-xl hover:bg-[#a5191c] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : "Upload Video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
