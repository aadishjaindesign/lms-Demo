"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetchApi("/student/dashboard");
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Unauthorized access. Please login again.");
          }
          throw new Error("Failed to fetch dashboard data");
        }
        const dashboardData = await res.json();
        setData(dashboardData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto h-full flex items-center justify-center">
        <div className="text-gray-500 font-medium">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center text-center py-20">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium border border-red-100 max-w-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-7xl mx-auto h-full px-3 sm:px-4 md:p-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#c71e22] to-red-900 rounded-[20px] p-6 md:p-10 shadow-sm text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 break-words">Welcome back, {data?.name}! 👋</h2>
          <p className="text-red-100 max-w-lg">
            Ready to continue learning? You have {data?.activeCoursesCount || 0} active courses available in your account.
          </p>
        </div>
        <Link 
          href="/student/courses"
          className="bg-white text-[#c71e22] font-semibold px-6 py-3 rounded-full hover:bg-gray-50 transition-colors shadow-sm text-center break-words"
        >
          Go to My Courses
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{data?.activeCoursesCount || 0}</div>
            <div className="text-gray-500 font-medium">Active Courses</div>
          </div>
        </div>
      </div>
    </div>
  );
}
