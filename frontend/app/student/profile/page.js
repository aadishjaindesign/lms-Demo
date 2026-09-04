"use client";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, we fetch dashboard data to get the basic profile info
    // as there is no dedicated profile endpoint yet.
    const fetchProfile = async () => {
      try {
        const res = await fetchApi("/student/dashboard");
        if (res.ok) {
          const profileData = await res.json();
          setData(profileData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto flex justify-center mt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c71e22]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto h-full px-1">
      {/* Top Banner */}
      <div className="bg-[#fceeed] rounded-2xl p-5 sm:p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-[#c71e22]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Student Profile</h2>
          <p className="text-gray-500 text-sm">View your account details</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px] border border-gray-100 flex-1">
        <div className="w-28 h-28 rounded-3xl bg-red-50 text-[#c71e22] font-bold flex items-center justify-center text-5xl mb-6 shadow-sm border border-red-100 uppercase">
          {data?.name?.charAt(0) || "S"}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{data?.name || "Student Name"}</h2>
        <p className="text-[#c71e22] font-medium text-sm mb-10 px-3 py-1 bg-red-50 rounded-full">Student</p>
        
        <div className="w-full max-w-md space-y-3">
          <div className="flex flex-col sm:flex-row justify-between p-4 bg-gray-50 rounded-xl gap-2 border border-gray-100">
            <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">Student ID</span>
            <span className="text-gray-900 font-medium break-all sm:break-normal">{data?.studentId || "N/A"}</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between p-4 bg-gray-50 rounded-xl gap-2 border border-gray-100">
            <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">Phone Number</span>
            <span className="text-gray-900 font-medium">{data?.phone || "N/A"}</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between p-4 bg-gray-50 rounded-xl gap-2 border border-gray-100">
            <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">Account Status</span>
            <span className={`font-bold text-sm px-2 py-0.5 rounded-full inline-flex items-center w-max ${data?.status === 'active' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
              {data?.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : 'Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
