"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function StudentRegisterPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#c71e22] selection:text-white text-white"
      style={{
        background: "linear-gradient(180deg, #8D0E1F 0%, #150204 40%, #000000 80%, #000000 100%)",
      }}
    >
      {/* Ambient Red Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-gradient-to-br from-[#8D0E1F]/50 to-transparent rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-br from-red-600/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#1C1C1E]/95 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 relative z-10 text-center"
      >
        {/* Header */}
        <div className="p-8 bg-black/40 border-b border-white/10">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo-white@2x.png" alt="Logo" className="h-10 sm:h-12 object-contain" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full inline-block mb-3">
            Registration Restricted
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Self-Registration Disabled
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Student account creation is centralized
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-medium">
              Account access is provisioned by Jains Computer administration. Please use your assigned credentials or contact support.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/student/login/"
              className="w-full bg-[#c71e22] hover:bg-[#a5191c] text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md shadow-red-500/20 text-sm hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              ← Return to Student Login
            </Link>
          </div>

          <div className="pt-4 border-t border-white/10 text-center">
            <p className="text-[11px] text-gray-500">
              Jain&apos;s Computer Institute • Administrative Desk
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
