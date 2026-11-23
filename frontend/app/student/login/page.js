"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { clearStudentCache } from "@/lib/studentCache";

export default function StudentLoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetchApi("/student/dashboard");
        if (res.ok) {
          router.push("/student/courses/");
        }
      } catch (e) {
        // Ignored
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        try {
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
          localStorage.removeItem("lms_student_info");
          clearStudentCache();
          localStorage.removeItem("student_info");
        } catch (e) {
          console.warn("localStorage not available", e);
        }
        window.location.href = "/student/courses/";
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#c71e22] selection:text-white text-white bg-transparent"
    >
      {/* Ambient Red Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-gradient-to-br from-[#8D0E1F]/50 to-transparent rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-br from-red-600/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#1C1C1E]/95 rounded-[8px] shadow-2xl w-full max-w-md overflow-hidden border border-white/10 relative z-10"
      >
        {/* Top Header Card */}
        <div className="p-8 text-center bg-black/40 border-b border-white/10 relative">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo@2x.png" alt="Logo" className="h-10 sm:h-12 object-contain" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-white bg-[#8D0E1F] px-3 py-1 rounded-[8px] border border-red-500/30 inline-block mb-2">
            Student Learning Portal
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Sign In to Portal</h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Access your course lectures, biometric attendance &amp; fee ledger
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-rose-950/80 text-rose-300 p-3.5 rounded-[8px] text-xs sm:text-sm font-semibold border border-rose-500/30 flex items-center gap-2.5">
              <span className="text-rose-400 font-bold">!</span>
              <span>{error}</span>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Student ID or ERP Enrollment No.
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-[8px] border border-white/15 focus:ring-2 focus:ring-[#c71e22] focus:border-transparent outline-none transition-all text-sm min-w-0 text-white bg-black/50"
              placeholder="e.g. STU-JC001 or RJ/2026/7002"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Account Password
            </label>
            <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-4 py-3 pr-16 rounded-[8px] border border-white/15 focus:ring-2 focus:ring-[#c71e22] focus:border-transparent outline-none transition-all text-sm min-w-0 text-white bg-black/50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#c71e22]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c71e22] hover:bg-[#a5191c] text-white font-bold py-3.5 px-4 rounded-[8px] transition-all shadow-md shadow-red-500/20 disabled:opacity-50 text-sm hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Authenticating...
              </>
            ) : (
              "Sign In to Student Portal"
            )}
          </button>

          <div className="text-center pt-4 border-t border-white/10 flex flex-col gap-2">
            <div className="bg-white/5 border border-white/10 rounded-[8px] p-3 text-center">
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                Account access is provisioned by Jains Computer administration. Please use your assigned credentials or contact support.
              </p>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Jain&apos;s Computer Institute • Official Student Desk
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
