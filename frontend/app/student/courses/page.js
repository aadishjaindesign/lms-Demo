"use client";

import { useState, useEffect } from "react";
import {
  useIsoLayoutEffect,
  readCachedStudent,
  readStudentCache,
  writeStudentCache,
} from "@/lib/studentCache";
import Link from "next/link";
import { LockIcon } from "@/components/DashboardIcons";
import { useFreeAccessExpired } from "@/lib/useFreeAccess";
import { fetchApi } from "@/lib/api";
import { computeMonthAttendance } from "@/lib/attendanceStats";
import {
  BellIcon as IoNotifications,
  GearIcon as IoSettingsSharp,
  LockIcon as IoLockClosed,
  ImageIcon as IoImageOutline,
  ReactIcon as FaReact,
  YoutubeIcon as FaYoutube,
  AdsIcon as SiGoogleads,
  CadIcon as SiAutodesk,
  ArrowRightIcon as HiArrowRight,
} from "@/components/DashboardIcons";

const LOCKED_PREVIEWS = [
  {
    id: "locked-1",
    timing: "11 AM Studio Lab",
    title: "UI/UX & Product Design",
  },
  {
    id: "locked-2",
    timing: "2 PM Classroom 4",
    title: "Full Stack & Next.js AI",
  },
  {
    id: "locked-3",
    timing: "4 PM Innovation Lab",
    title: "Motion Graphics & 3D VFX",
  },
];

export default function StudentCoursesPage() {
  const feesLocked = useFreeAccessExpired();
  const [courses, setCourses] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNotified, setIsNotified] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [watchedMap, setWatchedMap] = useState({});
  const [mounted, setMounted] = useState(false);

  const playClickSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch (e) {
      // AudioContext requires user interaction
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? "" : prev));
    }, 4000);
  };

  // Paint cached profile / courses / attendance before the first frame (no "Loading…" flash on revisit)
  useIsoLayoutEffect(() => {
    const cachedStudent = readCachedStudent();
    if (cachedStudent) setDashboardData((prev) => prev || cachedStudent);
    const cachedCourses = readStudentCache("courses");
    if (Array.isArray(cachedCourses)) {
      setCourses(cachedCourses);
      setLoading(false);
    }
    const cachedAttendance = readStudentCache("attendance");
    if (cachedAttendance) setAttendanceData(cachedAttendance);
    setMounted(true);
  }, []);

  useEffect(() => {
    const readJson = async (result) => {
      if (result.status !== "fulfilled" || !result.value?.ok) return null;
      try {
        return await result.value.json();
      } catch (e) {
        return null;
      }
    };

    const fetchData = async () => {
      try {
        // allSettled: one failing API must not hide the data from the others
        const [coursesRes, dashRes, attRes] = await Promise.allSettled([
          fetchApi("/student/courses"),
          fetchApi("/student/dashboard"),
          fetchApi("/student/attendance"),
        ]);

        const [coursesJson, dashJson, attJson] = await Promise.all([
          readJson(coursesRes),
          readJson(dashRes),
          readJson(attRes),
        ]);

        const freshCourses = coursesJson ? (Array.isArray(coursesJson) ? coursesJson : []) : null;
        if (freshCourses) {
          setCourses(freshCourses);
          writeStudentCache("courses", freshCourses);
        }
        if (dashJson) setDashboardData(dashJson);
        if (attJson) {
          setAttendanceData(attJson);
          writeStudentCache("attendance", attJson);
        }
      } catch (err) {
        console.error("Failed to load student dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Check stored notify preference and watched lessons
    try {
      if (typeof window !== "undefined") {
        setIsNotified(localStorage.getItem("lms_online_programs_notified") === "true");

        const map = {};
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith("lms_watched_")) {
            const cId = k.replace("lms_watched_", "");
            try {
              const val = JSON.parse(localStorage.getItem(k));
              map[cId] = Array.isArray(val) ? val.length : Number(val) || 0;
            } catch (e) {}
          }
        }
        setWatchedMap(map);
      }
    } catch (e) {}
  }, []);

  const handleNotify = () => {
    playClickSound();
    const nextState = !isNotified;
    setIsNotified(nextState);
    if (typeof window !== "undefined") {
      localStorage.setItem("lms_online_programs_notified", String(nextState));
    }
    if (nextState) {
      showToast("🔔 You'll be notified when Online Programs launch!");
    } else {
      showToast("Notification reminder removed.");
    }
  };

  // Student details from real backend
  const fullName = dashboardData?.name || "Student";
  const firstName = fullName.split(" ")[0];
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ST";
  const studentId =
    dashboardData?.enrollmentNumber || dashboardData?.studentId || "STU-JC001";
  const isEnrolled = dashboardData?.status === "active";
  const avatarUrl = dashboardData?.avatar || null;

  // Hydration-safe displays
  const initialsDisplay = mounted ? initials : "ST";
  const firstNameDisplay = mounted ? firstName : "Student";
  const studentIdDisplay = mounted ? studentId : "STU-JC001";
  const isEnrolledDisplay = mounted ? isEnrolled : true;

  // Fee Alert Data
  const feeAlert = dashboardData?.feeAlert;
  const hasDue = Boolean(feeAlert?.hasDue && feeAlert.dueAmount > 0);
  const dueAmount = feeAlert?.dueAmount || 0;
  const getDueFormatted = (d) => {
    if (!d) return "Pending";
    try {
      const dt = new Date(d);
      return `Due ${dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    } catch (e) {
      return "Due Soon";
    }
  };

  // Quick Stats Percentage
  const feePct =
    dashboardData?.feeSummary?.paidPercentage !== undefined
      ? dashboardData.feeSummary.paidPercentage
      : dashboardData?.feeAlert?.hasDue
      ? 0
      : 100;

  // Real current-month attendance (same calculation as the Attendance page)
  const attendanceStats = attendanceData
    ? computeMonthAttendance(
        attendanceData.records,
        Boolean(attendanceData.isCheckedInToday || attendanceData.todayRecord?.checkIn)
      )
    : null;
  const attendancePct = attendanceStats ? attendanceStats.pct : null;

  // Live Today Punch Status
  const todayRecord = attendanceData?.todayRecord;
  const isCheckedIn = Boolean(
    attendanceData?.isCheckedInToday || (todayRecord && todayRecord.checkIn)
  );
  const isCheckedOut = Boolean(
    attendanceData?.isCheckedOutToday || (todayRecord && todayRecord.checkOut)
  );

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="ml-auto text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 1. DESKTOP VERSION (Visible ONLY on Desktop >= md: hidden md:block)       */}
      {/* Exactly matching previous desktop layout with attendance buttons        */}
      {/* ======================================================================= */}
      <div className="desktop-view-wrapper hidden md:block">
        <div className="content">

        {/* Top Welcome Card (Desktop - Matches reference screenshots with Attendance Punch Action) */}
        <section className="card welcome">
          <div className="who">
            <div className="avatar" suppressHydrationWarning>{initialsDisplay}</div>
            <div>
              <div className="who-meta">
                <span className={`pill ${isEnrolledDisplay ? "c-ok" : "c-bad"}`} suppressHydrationWarning>
                  {isEnrolledDisplay ? "Enrolled" : "Inactive"}
                </span>
                <span className="id" suppressHydrationWarning>{studentIdDisplay}</span>
              </div>
              <h1 suppressHydrationWarning>Hello, {firstNameDisplay} 👋</h1>
              <p>Continue your classes or check your fees and attendance.</p>
            </div>
          </div>

          {/* Right Side: Attendance % summary → opens the Attendance page */}
          <Link
            href="/student/attendance/"
            onClick={playClickSound}
            className="group shrink-0 flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 hover:border-red-500/50 hover:bg-white/[0.05] transition-colors"
            title="Open attendance"
          >
            <div className="min-w-[150px]">
              <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attendance</span>
              <div className="flex items-baseline gap-2 mt-1">
                {attendancePct === null ? (
                  <span className="h-[30px] w-[72px] rounded-lg bg-white/10 animate-pulse" aria-label="Loading attendance" />
                ) : (
                  <span className="text-3xl font-extrabold text-white tabular-nums leading-none">
                    {`${attendancePct}%`}
                  </span>
                )}
                {attendancePct !== null && (
                  <span className={`pill ${attendancePct >= 75 ? "c-ok" : "c-bad"}`} style={{ height: "20px", fontSize: "11px", padding: "0 8px" }}>
                    {attendancePct >= 75 ? "Healthy" : "Needs Attention"}
                  </span>
                )}
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${(attendancePct ?? 100) >= 75 ? "bg-emerald-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, Math.max(0, attendancePct ?? 0))}%` }}
                />
              </div>
              {attendanceStats ? (
                <span className="block mt-1.5 text-[11px] text-gray-500">
                  {attendanceStats.attended}/{attendanceStats.conducted} days this month
                </span>
              ) : (
                <span className="block mt-2 h-2.5 w-28 rounded bg-white/10 animate-pulse" />
              )}
            </div>
            <span className="w-11 h-11 shrink-0 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-gray-300 group-hover:bg-red-600 group-hover:border-red-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </Link>
        </section>

        {/* Section: Continue Learning (Desktop Grid) */}
        <section>
          <div className="sec-head">
            <h2>
              Continue learning{" "}
              {!loading && (
                <span className="count">
                  {courses.length} {courses.length === 1 ? "class" : "classes"}
                </span>
              )}
            </h2>
            <Link href="/student/courses/" className="link" onClick={playClickSound}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="courses mt-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="card course animate-pulse" style={{ minHeight: "220px" }}>
                  <div className="thumb bg-white/5" />
                  <div className="course-body">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-white/5 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 mt-3">
              <p className="text-sm">No courses assigned yet. Contact your coordinator to enroll in classes.</p>
            </div>
          ) : (
            <div className="courses mt-3">
              {courses.map((course, idx) => {
                const hues = [0, 25, 345, 15, 45];
                const hue = hues[idx % hues.length];

                let timeBadge = "Recorded";
                const timeMatch = (course.name || "").match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
                if (timeMatch) {
                  timeBadge = timeMatch[0].toUpperCase();
                } else if (idx === 0) {
                  timeBadge = "9:00 AM";
                } else if (idx === 1) {
                  timeBadge = "10:30 AM";
                }

                const totalLessons = course.videoCount || 0;
                const watchedLessons = watchedMap[course._id] || 0;
                const progressPct =
                  totalLessons > 0 ? Math.min(100, Math.round((watchedLessons / totalLessons) * 100)) : 0;
                const isStarted = watchedLessons > 0;

                return (
                  <Link
                    key={course._id}
                    href={`/student/course/?id=${course._id}`}
                    className="card course"
                    onClick={playClickSound}
                  >
                    <div className="thumb" style={{ "--h": hue }}>
                      <span className="time">{timeBadge}</span>
                      <div className="play">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="6 3 20 12 6 21 6 3"></polygon>
                        </svg>
                      </div>
                    </div>
                    <div className="course-body">
                      <h3>{course.name}</h3>
                      <p>{course.description || "Course lectures & practical labs"}</p>
                      <div className="bar">
                        <i style={{ width: `${progressPct}%` }}></i>
                      </div>
                      <div className="course-foot">
                        <span>
                          {totalLessons > 0 ? `${watchedLessons}/${totalLessons} lessons` : "0 lessons"}
                        </span>
                        <span className="link">
                          {isStarted ? "Resume →" : "Start →"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Section: Online Programs (Desktop - Blurred with Coming Soon Overlay) */}
        <section className="card programs">
          <div className="programs-inner" aria-hidden="true">
            <h2>Online Programs</h2>
            <p>Marketing, CAD, Web Dev and Video courses you can learn at your own pace.</p>
            <div className="prog-row">
              <div className="prog">
                <i>
                  <SiGoogleads className="w-8 h-8 text-[#4285F4]" />
                </i>
                <span>Marketing</span>
              </div>
              <div className="prog">
                <i>
                  <SiAutodesk className="w-8 h-8 text-[#E01A22]" />
                </i>
                <span>CAD Design</span>
              </div>
              <div className="prog">
                <i>
                  <FaReact className="w-8 h-8 text-[#61DAFB]" />
                </i>
                <span>Web Dev</span>
              </div>
              <div className="prog">
                <i>
                  <FaYoutube className="w-8 h-8 text-[#FF0000]" />
                </i>
                <span>Video</span>
              </div>
            </div>
          </div>

          <div className="soon">
            <div className="lock">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2>Self-paced certification library</h2>
            <p>Full-length recorded series with hands-on projects, exercises and certificates.</p>
            <button
              type="button"
              className="btn-red"
              aria-pressed={isNotified}
              onClick={handleNotify}
            >
              {isNotified ? "✓ You'll be notified" : "Coming Soon"}
            </button>
          </div>
        </section>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. MOBILE PHONE APP LAYOUT (Visible ONLY on Mobile < md: block md:hidden) */}
      {/* Clean native-app layout matching user reference screenshot (Design #4)   */}
      {/* ======================================================================= */}
      <div className="mobile-view-wrapper block md:hidden w-full px-4 pb-2 text-white home-fit" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>

        {/* Top Header: 100% Round Avatar on left, Bell & Settings on right */}
        <div className="flex items-center justify-between pb-2">
          {/* Left: 100% Circular Avatar */}
          <Link href="/student/profile/" onClick={playClickSound} className="relative block group">
            <div className="app-avatar" suppressHydrationWarning>
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span suppressHydrationWarning>{initialsDisplay}</span>
              )}
            </div>
          </Link>

          {/* Right: Notifications & Settings Icons */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={handleNotify}
              className="app-icon-circle bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors relative"
              title={isNotified ? "Notifications active" : "Enable notifications"}
            >
              <IoNotifications className="w-5 h-5 text-amber-400" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#070606]" />
            </button>

            {/* Settings Gear */}
            <Link
              href="/student/profile/"
              onClick={playClickSound}
              className="app-icon-circle bg-red-950/60 border border-red-600/30 text-red-300 hover:text-white transition-all shadow-md shadow-red-950/40"
              title="Settings & Profile"
            >
              <IoSettingsSharp className="w-5 h-5 text-[#ff6b6b]" />
            </Link>
          </div>
        </div>

        {/* Greeting & Student ID */}
        <div className="mb-3">
          <h1 className="text-[22px] font-extrabold text-white flex items-center gap-2 tracking-tight" suppressHydrationWarning>
            Hello, {firstNameDisplay} <span className="inline-block">👋</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono tracking-wide mt-0.5" suppressHydrationWarning>
            ID:- {studentIdDisplay}
          </p>
        </div>

        {/* Attendance summary → opens the Attendance page (compact: same height as the old punch buttons) */}
        <Link
          href="/student/attendance/"
          onClick={playClickSound}
          className="mb-4 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-[#141112] px-4 py-3 active:scale-[0.99] transition-transform"
        >
          {attendancePct === null ? (
            <span className="shrink-0 h-7 w-[62px] rounded-lg bg-white/10 animate-pulse" aria-label="Loading attendance" />
          ) : (
            <span
              className={`shrink-0 text-[28px] font-extrabold leading-none tabular-nums ${
                attendancePct >= 75 ? "text-white" : "text-red-400"
              }`}
            >
              {`${attendancePct}%`}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-gray-300 truncate">Attendance · this month</span>
              {attendancePct !== null && (
                <span className={`shrink-0 font-semibold ${attendancePct >= 75 ? "text-emerald-400" : "text-red-400"}`}>
                  {attendancePct >= 75 ? "Healthy" : "Below 75%"}
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${(attendancePct ?? 100) >= 75 ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(100, Math.max(0, attendancePct ?? 0))}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-gray-500">
              {attendanceStats ? (
                <span className="truncate">{`${attendanceStats.attended} of ${attendanceStats.conducted} days`}</span>
              ) : (
                <span className="h-2.5 w-16 rounded bg-white/10 animate-pulse" />
              )}
              <span className="shrink-0">
                {!attendanceData
                  ? ""
                  : isCheckedOut
                  ? "Done for today"
                  : isCheckedIn
                  ? `In since ${todayRecord?.checkIn || todayRecord?.in || "today"}`
                  : "Not punched today"}
              </span>
            </div>
          </div>
          <span className="w-9 h-9 shrink-0 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white">
            <HiArrowRight className="w-4 h-4" />
          </span>
        </Link>

        {/* Section 1: Continue Learning (Equal padding, perfectly aligned) */}
        <section className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Continue Learning</h2>
            <Link href="/student/course/" className="text-gray-400 hover:text-white transition-colors p-1" onClick={playClickSound}>
              <HiArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Horizontal Scroll Carousel (Proper padding on both left and right) */}
          <div className="flex gap-3.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
            {/* Active Assigned Courses */}
            {loading ? (
              // Skeletons shaped like the real cards (locked previews stay hidden until data arrives,
              // so nothing jumps sideways when the real courses render)
              [1, 2].map((n) => (
                <div key={`sk-${n}`} className="app-course-card animate-pulse" aria-hidden="true">
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                  <div>
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/[0.06] mt-2" />
                  </div>
                </div>
              ))
            ) : courses.length > 0 ? (
              courses.map((course, idx) => (
                <Link
                  key={course._id || idx}
                  href={`/student/course/?id=${course._id}`}
                  onClick={playClickSound}
                  className="app-course-card group"
                >
                  {/* Top: Icon circle */}
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/90 group-hover:scale-105 transition-transform">
                    <IoImageOutline className="w-6 h-6 text-gray-200" />
                  </div>

                  {/* Bottom: Timing/Room & Course Title */}
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-tight leading-snug line-clamp-1">
                      {course.timing || "9 AM Classroom 2"}
                    </h3>
                    <p className="text-xs font-medium text-gray-400 mt-1 line-clamp-1">
                      {course.name || course.title || "Graphic Design"}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <Link
                href="/student/course/"
                onClick={playClickSound}
                className="app-course-card group"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/90 group-hover:scale-105 transition-transform">
                  <IoImageOutline className="w-6 h-6 text-gray-200" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
                    9 AM Classroom 2
                  </h3>
                  <p className="text-xs font-medium text-gray-400 mt-1">
                    Graphic Design
                  </p>
                </div>
              </Link>
            )}

            {/* 2-3 Locked Preview Cards as requested */}
            {!loading && LOCKED_PREVIEWS.map((item) => (
              <div key={item.id} className="app-locked-card" title="Locked Course - Available on next module">
                {/* Top: Lock Icon Badge + Pill */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(220,38,38,0.2)]">
                    <IoLockClosed className="w-5 h-5 text-[#ff6b6b]" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                    Locked
                  </span>
                </div>

                {/* Bottom: Timing & Course Title */}
                <div className="relative z-10">
                  <h3 className="text-base font-extrabold text-gray-300 tracking-tight leading-snug">
                    {item.timing}
                  </h3>
                  <p className="text-xs font-medium text-gray-400 mt-1">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Online Programs (Mobile - Blurred as requested) */}
        <section className="mt-2 mb-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Online Programs</h2>
              <p className="text-xs text-gray-400 mt-0.5 [@media(max-height:700px)]:hidden">Learn Anytime, At Your Own Pace.</p>
            </div>
            <button
              type="button"
              onClick={handleNotify}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Explore"
            >
              <HiArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* 4 Circular Program Icons with Blur effect */}
          <div className="relative">
            <div
              className="flex items-center justify-between px-2 pt-1 pb-1 select-none pointer-events-none"
              style={{ filter: "blur(6px) saturate(0.8)", opacity: 0.55 }}
            >
              {/* 1. Marketing */}
              <div className="flex flex-col items-center">
                <div className="app-prog-circle">
                  <SiGoogleads className="w-7 h-7 text-[#4285F4]" />
                </div>
                <span className="text-[11px] font-semibold text-gray-300 mt-1.5">Marketing</span>
              </div>

              {/* 2. Cad */}
              <div className="flex flex-col items-center">
                <div className="app-prog-circle">
                  <SiAutodesk className="w-7 h-7 text-[#E01A22]" />
                </div>
                <span className="text-[11px] font-semibold text-gray-300 mt-1.5">Cad</span>
              </div>

              {/* 3. Web Dev */}
              <div className="flex flex-col items-center">
                <div className="app-prog-circle">
                  <FaReact className="w-8 h-8 text-[#00D8FF]" />
                </div>
                <span className="text-[11px] font-semibold text-gray-300 mt-1.5">Web Dev</span>
              </div>

              {/* 4. Video */}
              <div className="flex flex-col items-center">
                <div className="app-prog-circle">
                  <FaYoutube className="w-8 h-8 text-[#FF0000]" />
                </div>
                <span className="text-[11px] font-semibold text-gray-300 mt-1.5">Video</span>
              </div>
            </div>

            {/* Coming Soon Button */}
            <div className="mt-2 flex justify-center pb-1">
              <button
                type="button"
                onClick={handleNotify}
                className="w-full max-w-[220px] py-2.5 px-6 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#e50914] via-[#cc0812] to-[#99040c] shadow-[0_4px_22px_rgba(229,9,20,0.5)] hover:shadow-[0_6px_28px_rgba(229,9,20,0.7)] active:scale-95 transition-all text-center"
              >
                {isNotified ? "✓ Notified on Launch" : "Coming Soon"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
