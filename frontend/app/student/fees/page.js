"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fetchApi } from "@/lib/api";
import { useIsoLayoutEffect, readStudentCache, writeStudentCache } from "@/lib/studentCache";
import DuesAlertBanner from "@/components/DuesAlertBanner";
import { useVideoActive } from "@/lib/useVideoActive";
import { LockIcon } from "@/components/DashboardIcons";
import { useFreeAccessExpired } from "@/lib/useFreeAccess";

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

export default function StudentFeesPage() {
  const [feeRecord, setFeeRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const isVideoActive = useVideoActive();
  const freeAccessExpired = useFreeAccessExpired();

  // GSAP tactile compression animation on card click
  const handleCardClick = (e) => {
    const target = e.currentTarget;
    gsap.timeline()
      .to(target, { scale: 0.97, duration: 0.1, ease: "power2.out" })
      .to(target, { scale: 1, duration: 0.25, ease: "back.out(2)" });
  };

  // Paint the last known fee ledger before the first frame; the fetch below refreshes it
  useIsoLayoutEffect(() => {
    const cached = readStudentCache("fees");
    if (cached) {
      setFeeRecord(cached.feeRecord ?? null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hadCache = Boolean(readStudentCache("fees"));
    const fetchFees = async () => {
      try {
        const res = await fetchApi("/student/fees");
        if (!res.ok) throw new Error("Failed to load fee details");
        const json = await res.json();
        setFeeRecord(json.feeRecord);
        setError("");
        writeStudentCache("fees", { feeRecord: json.feeRecord ?? null });
      } catch (err) {
        // Already showing the cached ledger: keep it instead of replacing the page with an error
        if (!hadCache) setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto animate-pulse" aria-busy="true" aria-label="Loading fees">
        <div className="h-7 w-48 rounded-lg bg-white/10 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-7 w-32 rounded-md bg-white/10 mt-3" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center justify-between gap-4">
              <div className="h-4 w-1/3 rounded bg-white/10" />
              <div className="h-4 w-20 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto text-center py-14">
        <div className="bg-red-50 text-[#c71e22] p-6 rounded-[8px] inline-block max-w-md font-medium border border-red-200/60 shadow-sm">
          <p className="font-bold text-base mb-1">Fee Ledger Error</p>
          <p className="text-xs text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#c71e22] text-white text-xs font-bold rounded-xl hover:bg-[#a5191c] transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const {
    totalAmount = 0,
    paidAmount = 0,
    dueAmount = 0,
    dueDate,
    feeStatus = "paid",
    installments = [],
  } = feeRecord || {};

  const hasDue = dueAmount > 0;
  const isOverdue = dueDate && new Date() > new Date(dueDate);

  const feeAlertData = hasDue
    ? {
        hasDue: true,
        dueAmount,
        dueDate,
        severity: isOverdue ? "danger" : "warning",
        message: isOverdue
          ? `Outstanding fee installment of ₹${dueAmount.toLocaleString("en-IN")} is past due. Please settle your account to ensure continued uninterrupted LMS access.`
          : `Upcoming fee installment of ₹${dueAmount.toLocaleString("en-IN")} is due on ${new Date(dueDate).toLocaleDateString("en-GB")}.`,
      }
    : null;

  return (
    <div className={`relative ${freeAccessExpired ? "h-[calc(100dvh-10rem)] md:h-[calc(100vh-4rem)] overflow-hidden" : ""}`}>
      <div className={freeAccessExpired ? "blur-md opacity-60 pointer-events-none select-none" : ""} aria-hidden={freeAccessExpired}>
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6 max-w-5xl mx-auto h-full px-3 sm:px-4"
    >
      {/* 1. Dynamic Dues Alert Banner */}
      {hasDue && <DuesAlertBanner feeAlert={feeAlertData} />}

      {/* 2. Header Hero Banner with Signature Gradient Theme */}
      <motion.div
        variants={cardVariants}
        className="relative overflow-hidden rounded-[8px] bg-[#1C1C1E]/95 border border-white/10 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-[#8D0E1F]/40 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-white bg-[#8D0E1F] px-3 py-1 rounded-full border border-red-500/30">
              Accounts &amp; Finance
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
              ERP Synced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Fee Management &amp; Invoices
          </h1>
          <p className="text-gray-300 text-sm mt-1 max-w-xl leading-relaxed">
            Track your program fees, download verified installment receipts, view due dates, and learn about offline payment counters.
          </p>
        </div>

        {/* Account Status Badge */}
        <div className="relative z-10 flex items-center gap-3.5 bg-black/60 backdrop-blur-md px-6 py-4 rounded-[8px] border border-white/15 shadow-sm shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Standing</span>
            <div
              className={`text-base sm:text-lg font-black uppercase tracking-wider mt-0.5 ${
                feeStatus === "paid" ? "text-emerald-400" : hasDue ? "text-amber-400" : "text-gray-300"
              }`}
            >
              {feeStatus === "paid" ? "All Cleared" : hasDue ? "Balance Due" : "Settled"}
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-[8px] flex items-center justify-center font-black text-lg shadow-2xs ${
              feeStatus === "paid"
                ? "bg-emerald-900/80 text-emerald-300 border border-emerald-500/40"
                : "bg-amber-900/80 text-amber-300 border border-amber-500/40"
            }`}
          >
            {feeStatus === "paid" ? "✓" : "!"}
          </div>
        </div>
      </motion.div>

      {/* 3. Metric Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          variants={cardVariants}
          onClick={handleCardClick}
          whileHover={isVideoActive ? {} : { y: -3 }}
          className="bg-[#1C1C1E]/95 rounded-[8px] p-6 border border-white/10 shadow-lg hover:border-white/20 transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Program Cost</span>
          <div className="text-3xl font-black text-white mt-2">
            ₹{totalAmount.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Full curriculum &amp; lab access</span>
        </motion.div>

        <motion.div
          variants={cardVariants}
          onClick={handleCardClick}
          whileHover={isVideoActive ? {} : { y: -3 }}
          className="bg-[#1C1C1E]/95 rounded-[8px] p-6 border border-white/10 shadow-lg hover:border-white/20 transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Paid</span>
          <div className="text-3xl font-black text-emerald-400 mt-2">
            ₹{paidAmount.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">ERP verified receipts</span>
        </motion.div>

        <motion.div
          variants={cardVariants}
          onClick={handleCardClick}
          whileHover={isVideoActive ? {} : { y: -3 }}
          className="bg-[#1C1C1E]/95 rounded-[8px] p-6 border border-white/10 shadow-lg hover:border-white/20 transition-all cursor-pointer"
        >
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Current Balance Due</span>
          <div className="text-3xl font-black text-rose-400 mt-2">
            ₹{dueAmount.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            {dueDate
              ? `Next due date: ${new Date(dueDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : "Zero outstanding balance"}
          </span>
        </motion.div>
      </motion.div>

      {/* 4. Enhanced Fee Breakdown & Payment Assistance Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tuition Inclusion Card */}
        <motion.div
          variants={cardVariants}
          className="bg-[#1C1C1E]/95 rounded-[8px] border border-white/10 p-6 shadow-xl flex flex-col justify-between"
        >
          <div>
            <h3 className="font-extrabold text-white text-base mb-1">Fee Inclusions &amp; Coverage</h3>
            <p className="text-xs text-gray-400 mb-4">Official Jain&apos;s Computer program benefits</p>

            <ul className="space-y-3 text-xs text-gray-300">
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
                <span>Full access to HD/HLS video lectures &amp; study notes</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
                <span>Practical computer lab workstations &amp; hardware tools</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
                <span>Biometric attendance tracking &amp; ERP registration</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
                <span>Course completion diploma &amp; authorized certification</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span>GST / Institute Levy: Included</span>
            <span className="font-bold text-emerald-400">100% Tax Compliant</span>
          </div>
        </motion.div>

        {/* Official Payment Methods & Counter Card */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-2 bg-[#1C1C1E]/95 rounded-[8px] border border-white/10 p-6 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-white text-base">Payment Counter &amp; Direct Deposit</h3>
              <span className="text-xs font-bold text-rose-300 bg-red-950/60 border border-red-500/30 px-3 py-1 rounded-full">
                Desk Assistance
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">How to settle upcoming course installment payments</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-[8px] bg-black/40 border border-white/5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-red-900/60 text-red-300 flex items-center justify-center font-bold text-xs">
                    🏢
                  </div>
                  <span className="text-xs font-bold text-white">Institute Cash &amp; Card Counter</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-2">
                  Visit the administrative office desk to pay via cash, debit card, or swipe POS.
                </p>
                <div className="text-[10px] text-gray-400 font-semibold">
                  Timing: Mon – Sat (9:00 AM – 6:30 PM)
                </div>
              </div>

              <div className="p-4 rounded-[8px] bg-black/40 border border-white/5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/80 text-emerald-300 flex items-center justify-center font-bold text-xs">
                    📱
                  </div>
                  <span className="text-xs font-bold text-white">Direct UPI / Bank Transfer</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-2">
                  Transfer via UPI and share the payment UTR reference with administration for instant receipt generation.
                </p>
                <div className="text-[10px] text-emerald-400 font-bold">
                  Accounts Helpline: +91-9893077717
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
            <span>Official Receipt Issued: Immediate on counter clearance</span>
            <span className="text-gray-500">Jain&apos;s Computer ERP Accounts Desk</span>
          </div>
        </motion.div>
      </div>

      {/* 5. Installment Schedule & Verified Receipts Table */}
      <motion.div variants={cardVariants} className="bg-[#1C1C1E]/95 rounded-[8px] border border-white/10 shadow-xl overflow-hidden text-white">
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Installment Schedule &amp; Receipts</h2>
            <p className="text-xs text-gray-400">Synced in real-time with Jain&apos;s Computer ERP Accounts</p>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
            ERP Live Ledger
          </span>
        </div>

        {installments.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            No installment records available for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-xs text-gray-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-6">Installment #</th>
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Receipt / Ref</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {installments.map((inst, idx) => {
                  const isPaid = inst.status === "paid";
                  const instDueDate = inst.dueDate
                    ? new Date(inst.dueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                  const paidDate = inst.paidDate
                    ? new Date(inst.paidDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : null;

                  return (
                    <tr key={inst._id || idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-bold text-white">
                        Installment #{inst.installmentNumber || idx + 1}
                      </td>
                      <td className="py-4 px-6 text-gray-300 font-medium">{instDueDate}</td>
                      <td className="py-4 px-6 font-extrabold text-white">
                        ₹{(inst.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                            isPaid
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                              : "bg-amber-950/80 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {inst.status || "pending"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-400">
                        {isPaid ? (
                          <div>
                            <span className="font-semibold text-white">
                              {inst.receiptNumber || `RCP-${inst.installmentNumber || idx + 1}`}
                            </span>
                            {paidDate && <div className="text-[11px] text-gray-400">Paid on {paidDate}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Pending payment</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isPaid ? (
                          <button
                            onClick={() => setSelectedReceipt(inst)}
                            className="text-xs font-bold text-rose-300 hover:text-white bg-red-950/60 hover:bg-red-900/80 px-3 py-1.5 rounded-xl border border-red-500/30 transition-colors"
                          >
                            View Voucher
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* 6. Receipt Voucher Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C1C1E] rounded-[8px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-white/10 relative text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2.5">
                  <img src="/logo@2x.png" alt="Logo" className="h-7" />
                  <span className="text-xs font-bold text-gray-400">Official Voucher</span>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-gray-300 mb-6">
                <div className="p-4 rounded-[8px] bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-300">Amount Received</span>
                    <div className="text-2xl font-black text-white mt-0.5">
                      ₹{(selectedReceipt.amount || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded-full uppercase border border-emerald-500/30">
                    Paid &amp; Cleared
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Receipt Ref Number</span>
                  <span className="font-bold text-white">{selectedReceipt.receiptNumber || "RCP-OFFICIAL"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Installment Number</span>
                  <span className="font-bold text-white">Installment #{selectedReceipt.installmentNumber || 1}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Payment Date</span>
                  <span className="font-bold text-white">
                    {selectedReceipt.paidDate ? new Date(selectedReceipt.paidDate).toLocaleDateString("en-GB") : "On Record"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-gray-400">Authorized Branch</span>
                  <span className="font-bold text-white">Jain&apos;s Computer ERP Portal</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-3 rounded-[8px] bg-[#c71e22] text-white font-bold text-xs hover:bg-[#a5191c] transition-colors"
              >
                Close Voucher
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
      </div>
      {freeAccessExpired && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
          <div className="flex flex-col items-center text-center max-w-sm px-6 py-8 rounded-[8px] bg-black/60 backdrop-blur-sm border border-white/10 shadow-2xl text-white">
            <div className="w-16 h-16 rounded-full bg-[#D71D3A]/20 border border-[#D71D3A]/50 flex items-center justify-center mb-4">
              <LockIcon className="w-8 h-8 text-[#ff4d63]" />
            </div>
            <h2 className="text-xl font-extrabold mb-2">Fees Locked</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Fee details are locked. Contact the Jains Computer office to unlock.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
