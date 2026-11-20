"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LockIcon } from "@/components/DashboardIcons";
import { useFreeAccessExpired } from "@/lib/useFreeAccess";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cleanPath = (pathname || "").replace(/\/$/, "");
  const feesLocked = useFreeAccessExpired();
  const [learningHref, setLearningHref] = useState("/student/course/");

  useEffect(() => {
    try {
      const lastId = localStorage.getItem("lms_last_course_id");
      if (lastId) setLearningHref(`/student/course/?id=${lastId}`);
    } catch (e) {}
  }, []);

  let activeTab = "home";
  if (cleanPath.startsWith("/student/attendance")) {
    activeTab = "attendance";
  } else if (cleanPath.startsWith("/student/course") && cleanPath !== "/student/courses") {
    activeTab = "learning";
  } else if (cleanPath.startsWith("/student/fees")) {
    activeTab = "fees";
  } else {
    activeTab = "home";
  }

  const isHome = activeTab === "home";
  const isAttendance = activeTab === "attendance";
  const isFees = activeTab === "fees";
  const isLearning = activeTab === "learning";

  return (
    <nav className="w-full bg-gradient-to-b from-[#14080a]/95 to-[#0a0506]/98 backdrop-blur-2xl border-t border-white/10 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] px-3 z-50">
      <div className="grid grid-cols-4 max-w-md mx-auto w-full items-center">
        {/* 1. Home */}
        <Link
          href="/student/courses/"
          className="flex flex-col items-center justify-center py-1 group transition-colors"
        >
          <div
            className={`flex items-center justify-center transition-all ${
              isHome
                ? "w-11 h-7 rounded-full bg-gradient-to-b from-[#ff2a2a] to-[#a3000a] text-white shadow-[0_6px_16px_-4px_rgba(255,40,40,0.75)]"
                : "w-11 h-7 text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
            </svg>
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 tracking-tight ${
              isHome ? "text-white font-bold" : "text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            Home
          </span>
        </Link>

        {/* 2. Attendance */}
        <Link
          href="/student/attendance/"
          className="flex flex-col items-center justify-center py-1 group transition-colors"
        >
          <div
            className={`flex items-center justify-center transition-all ${
              isAttendance
                ? "w-11 h-7 rounded-full bg-gradient-to-b from-[#ff2a2a] to-[#a3000a] text-white shadow-[0_6px_16px_-4px_rgba(255,40,40,0.75)]"
                : "w-11 h-7 text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="4" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 tracking-tight ${
              isAttendance ? "text-white font-bold" : "text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            Attendance
          </span>
        </Link>

        {/* 3. Fees */}
        <Link
          href="/student/fees/"
          className="flex flex-col items-center justify-center py-1 group transition-colors"
        >
          <div
            className={`relative flex items-center justify-center transition-all ${
              isFees
                ? "w-11 h-7 rounded-full bg-gradient-to-b from-[#ff2a2a] to-[#a3000a] text-white shadow-[0_6px_16px_-4px_rgba(255,40,40,0.75)]"
                : "w-11 h-7 text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <path d="M2 10h20M7 15h3" strokeLinecap="round" />
            </svg>
            {feesLocked && (
              <LockIcon className="absolute -top-1 right-0 w-3 h-3 text-white" />
            )}
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 tracking-tight ${
              isFees ? "text-white font-bold" : "text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            Fees
          </span>
        </Link>

        {/* 4. Learning */}
        <Link
          href={learningHref}
          className="flex flex-col items-center justify-center py-1 group transition-colors"
        >
          <div
            className={`flex items-center justify-center transition-all ${
              isLearning
                ? "w-11 h-7 rounded-full bg-gradient-to-b from-[#ff2a2a] to-[#a3000a] text-white shadow-[0_6px_16px_-4px_rgba(255,40,40,0.75)]"
                : "w-11 h-7 text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm6 3.5v5l4.5-2.5L10 9.5z" />
            </svg>
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 tracking-tight ${
              isLearning ? "text-white font-bold" : "text-[#8f8a8b] group-hover:text-white"
            }`}
          >
            Learning
          </span>
        </Link>
      </div>
    </nav>
  );
}
