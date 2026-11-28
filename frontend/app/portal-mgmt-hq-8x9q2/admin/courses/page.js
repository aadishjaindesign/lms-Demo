"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi, resolveCourseThumbnail } from "@/lib/api";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchApi("/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetchApi(`/courses/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchCourses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
    try {
      const res = await fetchApi(`/courses/${id}`, { method: "DELETE" });
      if (res.ok) fetchCourses();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const cardColors = [
    { bg: 'bg-[#fef9e7]', border: 'border-[#fdf0c4]', icon: 'text-[#d4a017]', iconBg: 'bg-[#fdeab3]' },
    { bg: 'bg-[#e8f4fd]', border: 'border-[#cce7f9]', icon: 'text-[#2a7ab5]', iconBg: 'bg-[#b8ddf5]' },
    { bg: 'bg-[#fceeed]', border: 'border-[#f8d5d4]', icon: 'text-[#c71e22]', iconBg: 'bg-[#f5c4c3]' },
    { bg: 'bg-[#e2f5ea]', border: 'border-[#c3e8d0]', icon: 'text-[#27a04b]', iconBg: 'bg-[#b0dfc1]' },
  ];

  return (
    <div className="flex flex-col gap-5 mx-auto h-full text-white">
      {/* Top Banner */}
      <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Courses Management</h2>
            <p className="text-gray-400 text-sm">Create, publish, and manage LMS curriculum &amp; video lectures</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-95 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-red-950/60 transition-all font-semibold flex items-center justify-center gap-2 text-sm w-full sm:w-auto flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          Add Course
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-96">
        <svg className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input 
          type="text" 
          placeholder="Search courses..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-black/50 border border-white/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D71D3A]/40 text-sm font-medium placeholder-gray-500 text-white shadow-sm" 
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-[#D71D3A] mb-4"></div>
          <p className="text-gray-400 font-medium text-sm">Loading courses...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center text-rose-400 font-medium">{error}</div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          {search ? 'No courses match your search.' : 'No courses found. Create your first course!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 flex-1">
          {filteredCourses.map((course) => {
            const isWebCourse = course.name.toLowerCase().includes('web');
            return (
              <Link 
                href={`/portal-mgmt-hq-8x9q2/admin/course?id=${course._id}`}
                key={course._id} 
                className={`bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col hover:border-red-500/40 transition-all group relative cursor-pointer block ${course.status === 'inactive' ? 'grayscale opacity-75' : ''}`}
              >
                {/* Hover action icons */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-20">
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedCourse(course); setIsEditModalOpen(true); }} 
                    className="text-gray-300 bg-black/70 hover:text-white hover:bg-black/90 p-2 rounded-xl shadow-sm transition-all backdrop-blur-sm border border-white/10" 
                    title="Edit Course"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(course._id); }} 
                    className="text-rose-400 bg-black/70 hover:text-rose-300 hover:bg-black/90 p-2 rounded-xl shadow-sm transition-all backdrop-blur-sm border border-white/10" 
                    title="Delete Course"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>

                {/* Status badge */}
                <div className="absolute top-4 left-4 z-20">
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleStatus(course._id, course.status); }}
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm backdrop-blur-sm border cursor-pointer hover:opacity-80 transition-opacity ${course.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                    {course.status}
                  </button>
                </div>

                {/* Visual Thumbnail Area */}
                <div className="aspect-video w-full relative overflow-hidden flex flex-col justify-end bg-black/60 border-b border-white/10">
                  {course.thumbnail ? (
                    <img src={resolveCourseThumbnail(course.thumbnail)} alt={course.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    /* Decorative Elements */
                    <div className="absolute inset-0 flex items-center justify-center text-white/5">
                      <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                        {isWebCourse 
                          ? <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          : <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        }
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content & Action Area */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-white leading-tight mb-2 break-words group-hover:text-red-400 transition-colors">{course.name}</h3>
                  {course.description && (
                    <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mb-4">
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    {course.videoCount || 0} Video Lectures
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                     <span className="text-xs font-bold text-[#D71D3A] group-hover:text-red-400 transition-colors">Manage Videos</span>
                     <svg className="w-4 h-4 text-[#D71D3A] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isAddModalOpen && (
        <CourseModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => { setIsAddModalOpen(false); fetchCourses(); }} 
        />
      )}

      {isEditModalOpen && selectedCourse && (
        <CourseModal 
          course={selectedCourse}
          onClose={() => setIsEditModalOpen(false)} 
          onSuccess={() => { setIsEditModalOpen(false); fetchCourses(); }} 
        />
      )}
    </div>
  );
}

function CourseModal({ course, onClose, onSuccess }) {
  const [name, setName] = useState(course?.name || "");
  const [description, setDescription] = useState(course?.description || "");
  const [thumbnail, setThumbnail] = useState(course?.thumbnail || "");
  const [status, setStatus] = useState(course?.status || "active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputType, setInputType] = useState("url");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const targetWidth = 1280;
          const targetHeight = 720;
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          
          // Draw with black background (to avoid transparent areas if any)
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // Calculate scale to fit without stretching
          const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
          const x = (targetWidth / scale - img.width) / 2;
          const y = (targetHeight / scale - img.height) / 2;
          
          ctx.save();
          ctx.scale(scale, scale);
          ctx.drawImage(img, x, y);
          ctx.restore();
          
          const resizedImage = canvas.toDataURL("image/jpeg", 0.85);
          setThumbnail(resizedImage);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const payload = { name, description, status };
    // Only send the thumbnail when it changed; the list API gives a short image path
    // for stored thumbnails and the backend keeps the original image.
    if (!course || thumbnail !== (course.thumbnail || "")) payload.thumbnail = thumbnail;
    const url = course ? `/courses/${course._id}` : "/courses";
    const method = course ? "PATCH" : "POST";

    try {
      const res = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Failed to save course");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] text-white">
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-lg font-bold text-white">{course ? "Edit Course" : "Add New Course"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && <div className="mb-4 text-xs text-rose-300 bg-rose-950/60 p-3 rounded-xl border border-rose-500/30 font-semibold">{error}</div>}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Course Name *</label>
            <input 
              type="text" required
              value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:border-transparent focus:outline-none text-sm text-white placeholder-gray-500"
              placeholder="Enter course name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
            <textarea 
              rows="3"
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:border-transparent focus:outline-none text-sm text-white placeholder-gray-500 resize-none"
              placeholder="Brief description of the course"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Course Thumbnail</label>
            
            <div className="flex border border-white/15 rounded-xl overflow-hidden mb-3 bg-black/50">
              <button 
                type="button" 
                onClick={() => setInputType("url")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${inputType === "url" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Image URL
              </button>
              <button 
                type="button" 
                onClick={() => setInputType("file")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${inputType === "file" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Upload File
              </button>
            </div>

            {inputType === "url" ? (
              <input 
                type="text"
                value={thumbnail} onChange={e => setThumbnail(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:border-transparent focus:outline-none text-sm text-white placeholder-gray-500"
                placeholder="https://..."
              />
            ) : (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-black/40 hover:bg-white/5 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg className="w-7 h-7 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="text-xs text-gray-300"><span className="font-semibold">Click to upload</span></p>
                    <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG or WebP (MAX. 10MB)</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}
            
            {thumbnail && (
              <div className="mt-3 relative w-full aspect-video rounded-xl overflow-hidden border border-white/15">
                <img src={resolveCourseThumbnail(thumbnail)} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => setThumbnail("")} 
                  className="absolute top-2 right-2 bg-black/80 p-1.5 rounded-full text-rose-400 hover:text-white shadow-sm border border-white/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            )}
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
            <select 
              value={status} onChange={e => setStatus(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:border-transparent focus:outline-none text-white text-sm"
            >
              <option value="active" className="bg-[#1C1C1E] text-white">Active</option>
              <option value="inactive" className="bg-[#1C1C1E] text-white">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-95 text-white rounded-xl shadow-lg shadow-red-950/60 transition-all disabled:opacity-50 font-semibold text-sm">
              {loading ? "Saving..." : "Save Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
