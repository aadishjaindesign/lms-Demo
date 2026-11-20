"use client";

import { useState } from "react";
import Link from "next/link";
import { LockIcon } from "@/components/DashboardIcons";
import { useFreeAccessExpired } from "@/lib/useFreeAccess";
import { motion, AnimatePresence } from "framer-motion";

export default function DuesAlertBanner({ feeAlert }) {
  const [dismissed, setDismissed] = useState(false);
  const locked = useFreeAccessExpired();

  if (!feeAlert || !feeAlert.hasDue || dismissed) {
    return null;
  }

  const { dueAmount, dueDate, severity, message } = feeAlert;
  const isDanger = severity === "danger";

  const formattedAmount = typeof dueAmount === "number" 
    ? `₹${dueAmount.toLocaleString("en-IN")}` 
    : `₹${dueAmount}`;

  const formattedDueDate = dueDate 
    ? new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full rounded-[8px] p-4 sm:p-5 shadow-lg backdrop-blur-md border ${
            isDanger
              ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-400/40 shadow-red-500/20"
              : "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white border-amber-300/40 shadow-amber-500/20"
          }`}
        >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left icon & text */}
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div
            className={`w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 shadow-inner ${
              isDanger ? "bg-white/20 text-white" : "bg-white/25 text-white"
            }`}
          >
            {isDanger ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/25 text-white/95 border border-white/20">
                {isDanger ? "🚨 Action Required • Overdue" : "🔔 Payment Notice • Due Soon"}
              </span>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-md text-white">
                {locked ? <span className="inline-flex items-center gap-1"><LockIcon className="w-3 h-3" /> Fees locked</span> : `Pending: ${formattedAmount}`}
              </span>
              {formattedDueDate && (
                <span className="text-[11px] text-white/80">
                  Due: {formattedDueDate}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
              {locked ? "Fee details are locked. Contact the Jains Computer office to unlock." : message}
            </p>
          </div>
        </div>

        {/* Right CTA & Dismiss */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link
            href="/student/fees/"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-gray-900 hover:bg-gray-100 shadow-md transition-all duration-200 hover:scale-105"
          >
            {locked ? <span className="inline-flex items-center gap-1"><LockIcon className="w-3.5 h-3.5" /> Locked</span> : "View Fee Details"}
          </Link>
          <button
            onClick={() => setDismissed(true)}
            title="Dismiss Alert"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
  );
}

