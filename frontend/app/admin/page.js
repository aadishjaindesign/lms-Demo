"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, studentsRes, coursesRes] = await Promise.all([
        fetchApi("/admin/dashboard-stats"),
        fetchApi("/students"),
        fetchApi("/courses"),
      ]);

      if (!statsRes.ok) throw new Error("Failed to load dashboard statistics");
      
      const statsJson = await statsRes.json();
      if (statsJson.success && statsJson.data) {
        setStats(statsJson.data);
      } else {
        throw new Error("Invalid response format");
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-[#c71e22] mb-4"></div>
        <p className="text-gray-500 font-medium text-sm">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-4 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Failed to load Dashboard</h2>
        <p className="text-gray-500 mb-6 max-w-md break-words text-sm">{error}</p>
        <button 
          onClick={fetchData}
          className="bg-[#c71e22] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#a5191c] transition-colors text-sm"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Get recent students (latest 3)
  const recentStudents = [...students]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  // Get active courses (latest 3)
  const activeCourses = courses
    .filter(c => c.status === 'active')
    .slice(0, 3);

  // Count items created this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const studentsThisMonth = students.filter(s => new Date(s.createdAt) >= startOfMonth).length;
  const coursesThisMonth = courses.filter(c => new Date(c.createdAt) >= startOfMonth).length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, Administrator. Here is an overview of Jains Computer LMS.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/students" 
            className="bg-[#c71e22] hover:bg-[#a5191c] text-white px-5 py-2.5 rounded-xl shadow-sm transition-colors font-semibold flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Add Student
          </Link>
          <Link 
            href="/admin/courses" 
            className="bg-white hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 transition-colors font-semibold flex items-center gap-2 text-sm shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Add Course
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Courses */}
        <div className="bg-[#fef9e7] border border-[#fdf0c4] rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-[#fdeab3] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#d4a017]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Courses</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.courses?.total || 0}</p>
          <p className="text-xs font-medium text-green-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            {coursesThisMonth} this month
          </p>
        </div>

        {/* Total Students */}
        <div className="bg-[#e8f4fd] border border-[#cce7f9] rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-[#b8ddf5] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#2a7ab5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Students</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.students?.total || 0}</p>
          <p className="text-xs font-medium text-green-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            {studentsThisMonth} this month
          </p>
        </div>

        {/* Total Videos */}
        <div className="bg-[#fceeed] border border-[#f8d5d4] rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-[#f5c4c3] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#c71e22]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Videos</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{stats?.videos?.total || 0}</p>
          <p className="text-xs font-medium text-green-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            {stats?.videos?.total || 0} this month
          </p>
        </div>
      </div>

      {/* Bottom Section: Recent Students + Active Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">
        {/* Recent Enrolled Students */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              <h3 className="font-semibold text-gray-900">Recent Enrolled Students</h3>
            </div>
            <Link href="/admin/students" className="text-[#c71e22] text-xs font-semibold hover:underline flex items-center gap-1">
              View All
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentStudents.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">No students yet</div>
            ) : (
              recentStudents.map((student, index) => (
                <div key={student._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#fceeed] text-[#c71e22] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                      <p className="text-xs text-gray-400">ID: {student.studentId} • {student.phone}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${student.status === 'active' ? 'bg-[#e2f5ea] text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {student.status === 'active' ? 'Active' : 'Blocked'}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Training Courses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#d4a017]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              <h3 className="font-semibold text-gray-900">Active Training Courses</h3>
            </div>
            <Link href="/admin/courses" className="text-[#c71e22] text-xs font-semibold hover:underline flex items-center gap-1">
              Manage Courses
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activeCourses.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">No active courses</div>
            ) : (
              activeCourses.map((course) => (
                <Link key={course._id} href={`/admin/courses/${course._id}`} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors block">
                  <div className="flex items-center gap-3">
                    {course.thumbnail ? (
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <img src={course.thumbnail} alt={course.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{course.name}</p>
                      <p className="text-xs text-gray-400">{course.description ? course.description.substring(0, 30) + '...' : 'No description'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="flex items-center gap-1 text-[#c71e22]">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                      <span className="text-xs font-bold">5.0</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
