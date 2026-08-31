"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetchApi("/student/courses");
        if (!res.ok) {
          throw new Error("Failed to load your courses");
        }
        const data = await res.json();
        setCourses(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto h-full flex items-center justify-center">
        <div className="text-gray-500 font-medium">Loading your courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-20">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block font-medium border border-red-100">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full">
      
      {courses.length === 0 ? (
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center h-[50vh]">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Courses</h3>
          <p className="text-gray-500 max-w-md">
            You don't have any active courses yet. If you believe this is an error, please contact your administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => {
            const isWebCourse = course.name.toLowerCase().includes('web');
            const expiry = new Date(course.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            
            return (
              <div key={course._id} className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group relative">
                
                {/* Visual Thumbnail Area */}
                <div className={`h-40 w-full relative p-6 flex flex-col justify-end overflow-hidden ${
                  isWebCourse ? 'bg-[#fcf3cc]' : 'bg-[#d2e7fe]'
                }`}>
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 p-4 text-black/10">
                    <svg className="w-24 h-24 transform translate-x-4 -translate-y-4" fill="currentColor" viewBox="0 0 24 24">
                      {isWebCourse 
                        ? <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        : <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      }
                    </svg>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1 drop-shadow-sm">{course.name}</h3>
                    <div className="text-sm font-medium text-gray-700/80 drop-shadow-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      {course.videoCount || 0} Videos
                    </div>
                  </div>
                </div>

                {/* Content & Action Area */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full inline-flex w-max mb-4">
                    Valid until {expiry}
                  </div>
                  
                  <div className="mt-auto">
                    <Link 
                      href={`/student/courses/${course._id}`}
                      className="block w-full text-center bg-gray-50 hover:bg-[#c71e22] text-gray-700 hover:text-white font-semibold py-2.5 rounded-xl transition-colors border border-gray-200 hover:border-[#c71e22]"
                    >
                      Continue Learning
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
