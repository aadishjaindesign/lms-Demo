"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LockIcon } from "@/components/DashboardIcons";
import { useFreeAccessExpired } from "@/lib/useFreeAccess";
import { fetchApi } from "@/lib/api";
import { clearStudentCache } from "@/lib/studentCache";

const FREE_ACCESS_DAYS = 60;

export default function StudentSidebar({ studentInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const cleanPath = (pathname || "").replace(/\/$/, "");

  const [currentStudent, setCurrentStudent] = useState(null);
  const feesLocked = useFreeAccessExpired();
  const [mounted, setMounted] = useState(false);
  const [learningHref, setLearningHref] = useState("/student/course/");

  useEffect(() => {
    setMounted(true);
    try {
      const lastId = localStorage.getItem("lms_last_course_id");
      if (lastId) setLearningHref(`/student/course/?id=${lastId}`);
    } catch (e) {}
  }, [pathname]);

  useEffect(() => {
    if (studentInfo) {
      setCurrentStudent(studentInfo);
    } else {
      try {
        const cached = localStorage.getItem("lms_student_info");
        if (cached) setCurrentStudent(JSON.parse(cached));
      } catch (e) {}
    }
  }, [studentInfo]);

  // 60-day free access window, counted from the account creation date
  const trial = (() => {
    const start = currentStudent?.createdAt ? new Date(currentStudent.createdAt) : null;
    if (!start || isNaN(start)) return null;
    const DAY = 24 * 60 * 60 * 1000;
    const end = new Date(start.getTime() + FREE_ACCESS_DAYS * DAY);
    const msLeft = end.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / DAY));
    return {
      daysLeft,
      expired: msLeft <= 0,
      usedPercent: Math.min(100, Math.max(0, ((FREE_ACCESS_DAYS - daysLeft) / FREE_ACCESS_DAYS) * 100)),
      endLabel: end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    };
  })();

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("lms_student_info");
        clearStudentCache();
        localStorage.removeItem("student_info");
      }
      await fetchApi("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/student/login/";
      } else {
        router.push("/student/login/");
      }
    }
  };

  // Exact same menu as mobile bottom navigation + Profile
  // Mutually exclusive active states (Only 1 item is active at any time!)
  let activeTab = "home";
  if (cleanPath.startsWith("/student/attendance")) {
    activeTab = "attendance";
  } else if (cleanPath.startsWith("/student/fees")) {
    activeTab = "fees";
  } else if (cleanPath.startsWith("/student/course") && cleanPath !== "/student/courses") {
    activeTab = "learning";
  } else if (cleanPath.startsWith("/student/profile") || cleanPath.startsWith("/student/password")) {
    activeTab = "profile";
  } else {
    activeTab = "home";
  }

  const navItems = [
    {
      name: "Home",
      href: "/student/courses/",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
          <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
        </svg>
      ),
      isActive: activeTab === "home",
    },
    {
      name: "Attendance",
      href: "/student/attendance/",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="4" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
      ),
      isActive: activeTab === "attendance",
    },
    {
      name: "Fees",
      href: "/student/fees/",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="3" />
          <path d="M2 10h20M7 15h3" strokeLinecap="round" />
        </svg>
      ),
      isActive: activeTab === "fees",
    },
    {
      name: "Learning",
      href: learningHref,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm6 3.5v5l4.5-2.5L10 9.5z" />
        </svg>
      ),
      isActive: activeTab === "learning",
    },
    {
      name: "Profile",
      href: "/student/profile/",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      isActive: activeTab === "profile",
    },
  ];

  return (
    <aside
      className="hidden md:flex flex-col justify-between w-64 lg:w-72 h-screen sticky top-0 shrink-0 border-r border-white/10 z-30 select-none"
      style={{
        background: "linear-gradient(180deg, #150204 0%, #0d0102 50%, #050001 100%)",
      }}
    >
      {/* Top Brand Logo */}
      <div className="p-6 pb-4">
        <Link href="/student/courses/" className="flex items-center gap-3 group">
          <img
            src="/logo-white@2x.png"
            alt="Jains Computer"
            className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
      </div>

      {/* Main Navigation Items (Exact Same as Phone Menu) */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto scrollbar-none">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-[8px] text-sm font-semibold transition-all duration-200 ${
              item.isActive
                ? "bg-gradient-to-r from-[#D71D3A] to-[#BA142D] text-white shadow-lg shadow-red-950/50 font-bold"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className={`shrink-0 ${item.isActive ? "text-white" : "text-gray-400"}`}>
              {item.icon}
            </span>
            <span>{item.name}</span>
            {item.name === "Fees" && feesLocked && (
              <LockIcon className="ml-auto w-4 h-4" />
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Section: Pro Upgrade Card & Student Account */}
      <div className="p-4 space-y-3">
        {/* Free Access Countdown Card (60 days from account creation) */}
        {mounted && trial && (
          <div className="bg-white rounded-[8px] p-4 text-gray-900 shadow-2xl relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {trial.expired ? "Free access ended" : "Free access"}
                </p>
                <h4 className="text-sm font-black text-gray-900 leading-snug mt-0.5">
                  {trial.expired
                    ? "Now a paid plan"
                    : `${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"} left`}
                </h4>
              </div>
              <span className="text-2xl shrink-0" role="img" aria-hidden="true">
                {trial.expired ? <LockIcon className="w-6 h-6 text-[#D71D3A]" /> : "⏳"}
              </span>
            </div>

            <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  trial.expired ? "bg-[#D71D3A]" : trial.daysLeft <= 7 ? "bg-amber-500" : "bg-[#20B486]"
                }`}
                style={{ width: `${trial.usedPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-500 leading-snug">
              {trial.expired
                ? "Contact the Jains Computer office to continue."
                : `Paid after ${trial.endLabel}`}
            </p>
          </div>
        )}

        {/* Student Profile Pill & Logout */}
        <div className="flex items-center justify-between p-2 rounded-[8px] bg-white/5 border border-white/10">
          <Link href="/student/profile/" className="flex items-center gap-2.5 min-w-0 flex-1 group">
            <div
              className="w-8 h-8 rounded-full bg-[#B33945] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm uppercase"
              suppressHydrationWarning
            >
              {mounted && currentStudent?.name ? currentStudent.name.charAt(0) : "S"}
            </div>
            <div className="min-w-0 flex-1 text-left" suppressHydrationWarning>
              <div
                className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors"
                suppressHydrationWarning
              >
                {mounted && currentStudent?.name ? currentStudent.name : "Student"}
              </div>
              <div className="text-[10px] text-gray-400 truncate" suppressHydrationWarning>
                {mounted && (currentStudent?.enrollmentNumber || currentStudent?.studentId)
                  ? currentStudent.enrollmentNumber || currentStudent.studentId
                  : "Learner"}
              </div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-[8px] transition-colors shrink-0"
            title="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
