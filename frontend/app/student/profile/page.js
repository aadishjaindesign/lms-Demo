"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import { fetchApi } from "@/lib/api";
import { computeMonthAttendance } from "@/lib/attendanceStats";
import {
  useIsoLayoutEffect,
  readCachedStudent,
  readStudentCache,
  writeStudentCache,
  clearStudentCache,
} from "@/lib/studentCache";
import { useVideoActive } from "@/lib/useVideoActive";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 24,
    },
  },
};

export default function ProfilePage() {
  const handleLogout = async () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("lms_student_info");
      clearStudentCache();
      localStorage.removeItem("student_info");
      await fetchApi("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      window.location.href = "/student/login/";
    }
  };

  const [data, setData] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isVideoActive = useVideoActive();

  // GSAP tactile compression animation on card click
  const handleCardClick = (e) => {
    const target = e.currentTarget;
    gsap.timeline()
      .to(target, { scale: 0.97, duration: 0.1, ease: "power2.out" })
      .to(target, { scale: 1, duration: 0.25, ease: "back.out(2)" });
  };

  // Paint the last known profile (saved by the layout) + attendance before the first frame
  useIsoLayoutEffect(() => {
    const cachedProfile = readCachedStudent();
    if (cachedProfile) {
      setData((prev) => prev || cachedProfile);
      setLoading(false);
    }
    const cachedAtt = readStudentCache("attendance");
    if (cachedAtt) {
      setAttendanceStats(
        computeMonthAttendance(
          cachedAtt.records,
          Boolean(cachedAtt.isCheckedInToday || cachedAtt.todayRecord?.checkIn)
        )
      );
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [res, attRes] = await Promise.allSettled([
          fetchApi("/student/dashboard"),
          fetchApi("/student/attendance"),
        ]);
        if (res.status === "fulfilled" && res.value.ok) {
          const profileData = await res.value.json();
          setData(profileData);
        }
        if (attRes.status === "fulfilled" && attRes.value.ok) {
          const attJson = await attRes.value.json();
          writeStudentCache("attendance", attJson);
          setAttendanceStats(
            computeMonthAttendance(
              attJson.records,
              Boolean(attJson.isCheckedInToday || attJson.todayRecord?.checkIn)
            )
          );
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
      <div className="flex flex-col gap-6 max-w-5xl mx-auto px-3 sm:px-4 animate-pulse" aria-busy="true" aria-label="Loading profile">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1">
            <div className="h-5 w-40 rounded-md bg-white/10" />
            <div className="h-3.5 w-28 rounded bg-white/[0.06] mt-2.5" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-5 w-36 rounded-md bg-white/10 mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const studentName = data?.name || "—";
  const studentId = data?.enrollmentNumber || data?.studentId || "—";
  const feeAlert = data?.feeAlert || { hasDue: false, dueAmount: 0 };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6 max-w-5xl mx-auto h-full px-3 sm:px-4 text-white"
    >
      {/* 1. Hero Identity Banner */}
      <motion.div
        variants={cardVariants}
        onClick={handleCardClick}
        className="relative overflow-hidden rounded-[8px] bg-[#1C1C1E]/95 border border-white/10 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center gap-6 cursor-pointer"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-[#8D0E1F]/50 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        {/* Avatar with Cap from Mockup */}
        <div className="relative z-10 shrink-0">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#B33945] text-white flex items-center justify-center font-bold text-4xl sm:text-5xl shadow-md uppercase"
            suppressHydrationWarning
          >
            {studentName ? studentName.charAt(0) : "S"}
          </div>
        </div>

        {/* Info & Badges */}
        <div className="relative z-10 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-white bg-[#8D0E1F] px-3 py-1 rounded-[8px] border border-red-500/30">
              Verified Student
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-[8px] border border-emerald-500/30 flex items-center gap-1">
              ✓ ERP Admission Synced
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1 truncate">
            {studentName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Jain&apos;s Computer Institute of Technology &amp; Management • Session 2026
          </p>
        </div>

        {/* Status Chip */}
        <div className="relative z-10 shrink-0">
          <span className="px-4 py-1.5 rounded-[8px] text-xs font-black uppercase tracking-wider border shadow-2xs bg-emerald-950/80 text-emerald-300 border-emerald-500/30">
            Active Account
          </span>
        </div>
      </motion.div>

      {/* 2. Identity Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tile 1: Academic Identity */}
        <motion.div
          variants={cardVariants}
          onClick={handleCardClick}
          whileHover={isVideoActive ? {} : { y: -3 }}
          className="bg-[#1C1C1E]/95 rounded-[8px] border border-white/10 p-6 shadow-xl flex flex-col justify-between cursor-pointer"
        >
          <div>
            <h3 className="font-extrabold text-white text-base mb-1">Academic Credentials</h3>
            <p className="text-xs text-gray-400 mb-5">Official enrollment and admission identifiers</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-[8px] border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Enrollment No</span>
                <span className="text-xs sm:text-sm font-extrabold text-white">
                  {studentId}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-[8px] border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">LMS Student ID</span>
                <span className="text-xs sm:text-sm font-extrabold text-rose-400">
                  {data?.studentId || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-[8px] border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Registered Phone</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-200">
                  {data?.phone || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 text-xs text-gray-400 flex items-center justify-between">
            <span>Identity Authority: Jain&apos;s Computer ERP</span>
            <span className="font-bold text-emerald-400">Active</span>
          </div>
        </motion.div>

        {/* Tile 2: Academic Standing & Health */}
        <motion.div
          variants={cardVariants}
          onClick={handleCardClick}
          whileHover={isVideoActive ? {} : { y: -3 }}
          className="bg-[#1C1C1E]/95 rounded-[8px] border border-white/10 p-6 shadow-xl flex flex-col justify-between cursor-pointer"
        >
          <div>
            <h3 className="font-extrabold text-white text-base mb-1">Portal Standing &amp; Compliance</h3>
            <p className="text-xs text-gray-400 mb-5">Biometric attendance and fee status</p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div
                className={`p-4 rounded-[8px] text-center border ${
                  !attendanceStats || attendanceStats.isHealthy
                    ? "bg-emerald-950/60 border-emerald-500/30"
                    : "bg-red-950/50 border-red-500/30"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    !attendanceStats || attendanceStats.isHealthy ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  Attendance
                </span>
                <div className="text-2xl font-black text-white mt-1">
                  {attendanceStats ? `${attendanceStats.pct}%` : "—"}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  {attendanceStats ? `${attendanceStats.attended} / ${attendanceStats.conducted} days this month` : "Not available"}
                </span>
              </div>

              <div className="p-4 rounded-[8px] bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fee Standing</span>
                <div className={`text-2xl font-black mt-1 ${feeAlert.hasDue ? "text-amber-400" : "text-emerald-400"}`}>
                  {feeAlert.feePercentage !== undefined ? `${feeAlert.feePercentage}%` : (feeAlert.hasDue ? "Pending" : "100%")}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  {feeAlert.hasDue ? "Payment Pending" : "All Clear"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-black/40 rounded-[8px] border border-white/5 flex items-center justify-between text-xs text-gray-300">
              <span>Active Assigned Modules:</span>
              <strong className="text-white font-extrabold">{data?.assignedCoursesCount ?? 0} Enrolled</strong>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 text-xs text-gray-400 flex items-center justify-between">
            <span>Biometric Sync: Online</span>
            <span className="text-rose-400 font-bold">Good Standing</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Fast Actions Bar */}
      <motion.div
        variants={cardVariants}
        className="bg-[#1C1C1E]/95 rounded-[8px] border border-white/10 p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div>
          <h4 className="font-extrabold text-white text-sm">Quick Links</h4>
          <p className="text-xs text-gray-400">Jump to your attendance, fees or home dashboard</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link
            href="/student/attendance/"
            className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-[8px] bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/5"
          >
            Attendance Sheet
          </Link>
          <Link
            href="/student/fees/"
            className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-[8px] bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/5"
          >
            Fee Ledger
          </Link>
          <Link
            href="/student/courses/"
            className="flex-1 sm:flex-none text-center px-5 py-2.5 rounded-xl bg-[#c71e22] hover:bg-[#a5191c] text-white text-xs font-bold shadow-md shadow-red-500/30 transition-colors"
          >
            Home Dashboard →
          </Link>
        </div>
      </motion.div>

      {/* Mobile-only Logout (sidebar with logout is hidden on phones) */}
      <button
        onClick={handleLogout}
        className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
    </motion.div>
  );
}
