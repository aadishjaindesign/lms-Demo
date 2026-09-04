"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function StudentCourseDetailsPage() {
  const { courseId } = useParams();
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
  const [playingVideo, setPlayingVideo] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState("");

  const handlePlayVideo = async (video) => {
    setPlayingVideo(video);
    if (video.storageProvider === 'r2') {
      try {
        const res = await fetchApi(`/courses/${courseId}/videos/${video._id}/playback-url`);
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

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        // Fetch course details
        const courseRes = await fetchApi(`/student/courses/${courseId}`);
        if (!courseRes.ok) {
          if (courseRes.status === 401) throw new Error("Please log in again.");
          if (courseRes.status === 403) {
            const data = await courseRes.json();
            if (data.error === 'ACCESS_EXPIRED') throw new Error("This course access has expired.");
            if (data.error === 'ACCESS_REVOKED') throw new Error("This course access is no longer available.");
            throw new Error("You do not have access to this course.");
          }
          throw new Error("Failed to load course details.");
        }
        
        const courseData = await courseRes.json();
        setCourse(courseData);

        // Fetch videos ONLY if course access is granted
        const videoRes = await fetchApi(`/student/courses/${courseId}/videos`);
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
    
    fetchCourseData();
  }, [courseId]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c71e22] mb-4"></div>
        <div className="text-gray-500 font-medium">Loading course material...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-full py-10 md:py-20">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl max-w-md w-full text-center border border-red-100 shadow-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="font-medium text-red-500 mb-6">{error}</p>
          <Link href="/student/courses" className="inline-block bg-white text-red-600 border border-red-200 px-6 py-2.5 rounded-xl font-semibold hover:bg-red-50 transition-colors">
            Back to My Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-2">
        <Link href="/student/courses" className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Courses
        </Link>
        <h1 className="text-2xl md:text-[32px] font-bold text-gray-900 leading-tight mb-2 break-words hyphens-auto">{course.name}</h1>
        <p className="text-gray-600 text-sm md:text-base max-w-3xl leading-relaxed break-words hyphens-auto">{course.description || "No description available for this course."}</p>
      </div>

      {/* Videos List */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4 md:p-8 flex-1">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <svg className="w-6 h-6 text-[#c71e22]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          Course Videos ({videos.length})
        </h2>
        
        {videos.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No videos available yet</h3>
            <p className="text-gray-500 text-sm max-w-sm">The instructor hasn&apos;t uploaded any videos to this course yet. Check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => {
              // Use dummy thumbnail for R2 or Cloudinary thumbnail
              const thumbnailUrl = video.storageProvider === 'r2' 
                ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='5 3 19 12 5 21 5 3'%3E%3C/polygon%3E%3C/svg%3E" 
                : (video.secureUrl ? video.secureUrl.replace(/\.[^/.]+$/, ".jpg") : "");
              
              return (
                <div key={video._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => handlePlayVideo(video)}>
                  <div className="relative aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
                    {video.storageProvider === 'r2' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <svg className="w-16 h-16 text-gray-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                      </div>
                    ) : (
                      <img src={thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105" />
                    )}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-7 h-7 text-[#c71e22] ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#c71e22] tracking-wider uppercase mb-1.5 block">Lesson {String(index + 1).padStart(2, '0')}</span>
                        <h3 className="font-bold text-gray-900 line-clamp-2 text-lg leading-snug group-hover:text-[#c71e22] transition-colors break-words">{video.title}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {playingVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-black rounded-xl overflow-hidden w-full max-w-4xl shadow-2xl relative flex flex-col">
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10">
              <button onClick={() => setPlayingVideo(null)} className="bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <video 
              controls 
              autoPlay 
              className="w-full max-h-[80vh] bg-black"
              src={playbackUrl}
            >
              Your browser does not support the video tag.
            </video>
            <div className="p-4 bg-gray-900 text-white flex flex-col sm:flex-row sm:justify-between gap-2">
              <h3 className="font-bold text-lg break-words">{playingVideo.title}</h3>
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
