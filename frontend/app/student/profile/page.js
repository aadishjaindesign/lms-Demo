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
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-[20px] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">My Profile</h2>
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#fceeed] text-[#C62026] flex items-center justify-center font-bold text-4xl md:text-5xl shrink-0 mx-auto md:mx-0">
            {data?.name?.charAt(0) || "S"}
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-900 font-medium">
                  {data?.name || "Student Name"}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Student ID</label>
                <div className="p-3 bg-gray-50 rounded-xl text-gray-900 font-medium break-all">
                  {data?.studentId || "N/A"}
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <div className="p-3 bg-green-50 text-green-700 rounded-xl font-medium inline-block">
                  Active
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                To update your profile information, please contact the administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
