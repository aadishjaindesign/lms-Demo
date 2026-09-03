"use client";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi("/admin/dashboard-stats");
      if (!res.ok) {
        throw new Error("Failed to load dashboard statistics");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load Dashboard</h2>
        <p className="text-gray-600 mb-6 max-w-md break-words">{error}</p>
        <button 
          onClick={fetchStats}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full px-2 sm:px-4 md:px-0">
      {/* Top Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Students Card */}
        <div className="bg-[#d2e7fe] rounded-[20px] p-6 sm:p-8 flex flex-col justify-center shadow-sm">
          <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-4 text-center">Students</h2>
          <div className="text-3xl sm:text-4xl md:text-[40px] font-bold text-gray-900 leading-tight mb-6 text-center">{stats?.students?.total || 0}</div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm sm:text-base">
            <div className="bg-white/50 p-3 rounded-xl border border-white/60">
              <div className="font-semibold text-green-700">Active</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">{stats?.students?.active || 0}</div>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border border-white/60">
              <div className="font-semibold text-red-600">Blocked</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">{stats?.students?.blocked || 0}</div>
            </div>
          </div>
        </div>

        {/* Total Courses Card */}
        <div className="bg-[#fceeed] rounded-[20px] p-6 sm:p-8 flex flex-col justify-center shadow-sm">
          <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-4 text-center">Courses</h2>
          <div className="text-3xl sm:text-4xl md:text-[40px] font-bold text-gray-900 leading-tight mb-6 text-center">{stats?.courses?.total || 0}</div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm sm:text-base">
            <div className="bg-white/50 p-3 rounded-xl border border-white/60">
              <div className="font-semibold text-green-700">Active</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">{stats?.courses?.active || 0}</div>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border border-white/60">
              <div className="font-semibold text-gray-600">Inactive</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">{(stats?.courses?.total || 0) - (stats?.courses?.active || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[300px]">
        {/* Videos Card */}
        <div className="bg-[#fcf3cc] rounded-[20px] p-6 sm:p-8 flex flex-col items-center justify-center shadow-sm text-center">
          <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-2">Total Videos</h2>
          <div className="text-3xl sm:text-4xl md:text-[40px] font-bold text-gray-900 leading-tight mb-2">{stats?.videos?.total || 0}</div>
          <div className="text-orange-600 font-medium flex items-center justify-center bg-white/50 px-4 py-2 rounded-full border border-white/60">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
            Uploaded to R2 & Cloudinary
          </div>
        </div>
        
        {/* Course Access Card */}
        <div className="bg-[#e4f8e5] rounded-[20px] p-6 sm:p-8 flex flex-col items-center justify-center shadow-sm text-center">
          <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-4">Course Access</h2>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="bg-white/50 p-4 rounded-xl border border-white/60">
              <div className="font-semibold text-green-700 mb-1">Active / Valid</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats?.courseAccess?.active || 0}</div>
            </div>
            <div className="bg-white/50 p-4 rounded-xl border border-white/60">
              <div className="font-semibold text-red-600 mb-1">Expired / Past</div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats?.courseAccess?.expired || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
