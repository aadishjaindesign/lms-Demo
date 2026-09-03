"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

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
    'bg-[#fceeed]', // Pink
    'bg-[#dcfce7]', // Green
    'bg-[#d2e7fe]', // Blue
    'bg-[#fcf3cc]', // Yellow
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full px-4 md:px-8 py-8">
      {/* Top Banner Card */}
      <div className="bg-[#fceeed] rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-5">
          <div className="text-[#C62026]">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <div>
            <h2 className="text-[28px] font-semibold text-gray-900 leading-tight mb-1">Courses</h2>
            <p className="text-gray-500 text-sm font-medium">Manage and control courses</p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#c71e22] hover:bg-[#a5191c] text-white px-6 py-2.5 rounded-full shadow-sm transition-colors font-semibold flex items-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Add course
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between mt-2">
        <div className="relative w-full md:w-80">
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Search courses" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 text-sm font-medium placeholder-gray-400 shadow-sm" 
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading courses...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 font-medium">{error}</div>
      ) : courses.length === 0 ? (
        <div className="py-20 text-center text-gray-500">No courses found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 min-h-[300px]">
          {filteredCourses.map((course, index) => (
            <div 
              key={course._id} 
              className={`${cardColors[index % 4]} rounded-[20px] p-6 md:p-12 flex flex-col items-center justify-center shadow-sm relative group`}
            >
              {/* Subtle Edit/Delete icons on hover */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button onClick={() => { setSelectedCourse(course); setIsEditModalOpen(true); }} className="text-gray-700 bg-white/50 hover:bg-white p-2 rounded-full shadow-sm transition-colors" title="Edit Course">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                 </button>
                 <button onClick={() => handleDelete(course._id)} className="text-red-600 bg-white/50 hover:bg-white p-2 rounded-full shadow-sm transition-colors" title="Delete Course">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                 </button>
              </div>

              {course.thumbnail ? (
                <div className="w-full h-40 mb-4 overflow-hidden rounded-xl border border-gray-100 flex items-center justify-center bg-gray-50">
                  <img src={course.thumbnail} alt={course.name} className="w-full h-full object-cover" />
                </div>
              ) : course.name.toLowerCase().includes('web') && (
                <div className="text-gray-900 mb-2 font-bold text-3xl">{'</>'}</div>
              )}
              
              <h2 className="text-2xl md:text-[28px] font-medium text-gray-900 mb-3 text-center leading-tight break-words">{course.name}</h2>
              
              <Link href={`/admin/courses/${course._id}`} className="flex items-center gap-2 text-gray-700 hover:text-black font-medium transition-colors">
                Upload Video
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </Link>
            </div>
          ))}
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
  const [inputType, setInputType] = useState("url"); // "url" or "file"

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("File size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const payload = { name, description, thumbnail };
    if (!course) {
      payload.status = status;
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{course ? "Edit Course" : "Add New Course"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
            <input 
              type="text" required
              value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#c71e22] focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              rows="3"
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#c71e22] focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Course Thumbnail</label>
            
            <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-3">
              <button 
                type="button" 
                onClick={() => setInputType("url")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${inputType === "url" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                Image URL
              </button>
              <button 
                type="button" 
                onClick={() => setInputType("file")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${inputType === "file" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                Upload File
              </button>
            </div>

            {inputType === "url" ? (
              <input 
                type="text"
                value={thumbnail} onChange={e => setThumbnail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#c71e22] focus:outline-none"
                placeholder="https://..."
              />
            ) : (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                    <p className="text-xs text-gray-500">SVG, PNG, JPG or GIF (MAX. 2MB)</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}
            
            {thumbnail && (
              <div className="mt-3 relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => setThumbnail("")} 
                  className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-500 hover:bg-white shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            )}
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#c71e22] focus:outline-none bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#c71e22] text-white rounded-lg hover:bg-[#a5191c] transition-colors disabled:opacity-50">
              {loading ? "Saving..." : "Save Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
