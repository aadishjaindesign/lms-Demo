"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useState, useEffect } from "react";
import SessionConflictModal from "@/components/SessionConflictModal";
import MobileBottomNav from "@/components/MobileBottomNav";
import StudentSidebar from "@/components/StudentSidebar";

export default function StudentLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [studentInfo, setStudentInfo] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Synchronize cached profile safely on client mount without hydration mismatch
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("lms_student_info");
        if (cached) setStudentInfo(JSON.parse(cached));
      }
    } catch (e) {}

    const handleProfileUpdate = () => {
      try {
        const cached = localStorage.getItem("lms_student_info");
        if (cached) setStudentInfo(JSON.parse(cached));
      } catch (e) {}
    };
    window.addEventListener("student_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("student_profile_updated", handleProfileUpdate);
  }, []);

  useEffect(() => {
    // Skip auth check if on public pages (login or register)
    if (
      pathname === "/student/login" || 
      pathname === "/student/login/" ||
      pathname === "/student/register" ||
      pathname === "/student/register/"
    ) {
      setIsChecking(false);
      return;
    }

    // If already authenticated and have studentInfo, avoid redundant re-verification on route changes
    if (isAuthenticated && studentInfo) {
      setIsChecking(false);
      return;
    }

    let isMounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetchApi("/student/dashboard");
        if (res.ok && isMounted) {
          const data = await res.json();
          setStudentInfo(data);
          try {
            localStorage.setItem("lms_student_info", JSON.stringify(data));
          } catch (e) {}
        } else if (isMounted) {
          setStudentInfo(null);
        }
      } catch (err) {
        if (isMounted) setStudentInfo(null);
      } finally {
        if (isMounted) {
          setIsAuthenticated(true);
          setIsChecking(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname, isAuthenticated, studentInfo]);

  if (
    pathname === "/student/login" || 
    pathname === "/student/login/" ||
    pathname === "/student/register" ||
    pathname === "/student/register/"
  ) {
    return <>{children}</>;
  }

  const cleanPath = (pathname || "").replace(/\/$/, "");
  const isCoursesPage = cleanPath === "/student/courses" || cleanPath === "/student";

  const studentName = studentInfo?.name || "";
  const initials = studentName
    ? studentName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  return (
    <div
      className={`min-h-screen max-md:fixed max-md:inset-0 max-md:min-h-0 max-md:overflow-hidden text-white flex flex-col md:flex-row font-sans selection:bg-[#c71e22] selection:text-white relative overflow-x-hidden bg-transparent`}
    >
      {/* 1. Desktop Left Sidebar (Matching reference screenshot exactly, NO top navbar) */}
      <StudentSidebar studentInfo={studentInfo} />

      {/* 2. Unified Mobile App Top Bar: Left = Logo only, Right = Student Avatar (RS/KS) (Hidden on courses page to match native mobile app look) */}
      {!isCoursesPage && (
        <header className="md:hidden bg-[#070606]/92 backdrop-blur-xl border-b border-white/10 min-h-14 pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 shrink-0 shadow-lg sticky top-0 z-40">
          <Link href="/student/courses/" className="flex items-center">
            <img src="/logo-white@2x.png" alt="Jains Computer" className="h-7 w-auto object-contain" />
          </Link>

          <Link
            href="/student/profile/"
            className={`avatar ${mounted && studentName ? "" : "animate-pulse !bg-white/10"}`}
            style={{ width: "36px", height: "36px", fontSize: "13px" }}
            title={studentName || "Profile"}
            suppressHydrationWarning
          >
            {mounted && studentName ? initials : null}
          </Link>
        </header>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col max-md:overflow-y-auto max-md:[-webkit-overflow-scrolling:touch] max-md:overscroll-contain md:h-screen md:overflow-y-auto">
        <main
          className={`flex-1 w-full ${
            isCoursesPage
              ? "p-0 md:p-8 md:max-w-6xl md:mx-auto"
              : "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-4 md:pb-8"
          }`}
        >
          {children}
        </main>
      </div>

      {/* 4. Sleek Mobile Bottom Navigation (Visible ONLY on Mobile screens < md) */}
      <div className="md:hidden shrink-0 z-50">
        <MobileBottomNav />
      </div>

      <SessionConflictModal />
    </div>
  );
}
