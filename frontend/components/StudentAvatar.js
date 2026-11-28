"use client";

import { useState } from "react";

export default function StudentAvatar({ src, name = "", size = "w-12 h-12" }) {
  const [imgError, setImgError] = useState(false);

  // If image fails or not provided, render modern illustrated profile with cap
  if (imgError || !src) {
    return (
      <div
        className={`${size} rounded-full overflow-hidden border border-white/20 shadow-md bg-gradient-to-b from-[#2B1B1F] to-[#120508] flex items-center justify-center shrink-0 relative`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
          <defs>
            <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5CBA7" />
              <stop offset="100%" stopColor="#E0A985" />
            </linearGradient>
            <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#222" />
              <stop offset="100%" stopColor="#111" />
            </linearGradient>
          </defs>
          {/* Background */}
          <rect width="100" height="100" fill="#2A171C" />
          {/* Body / Jacket */}
          <path d="M15 100 C18 75 30 70 50 70 C70 70 82 75 85 100 Z" fill="#1C1C1E" />
          {/* Inner Shirt / Collar */}
          <path d="M42 70 L50 82 L58 70 Z" fill="#E57373" />
          {/* Neck */}
          <rect x="43" y="55" width="14" height="18" fill="url(#skinGrad)" rx="3" />
          {/* Face */}
          <ellipse cx="50" cy="46" rx="19" ry="21" fill="url(#skinGrad)" />
          {/* Beard / Stubble subtle */}
          <path d="M35 48 C35 62 42 66 50 66 C58 66 65 62 65 48 C65 57 58 62 50 62 C42 62 35 57 35 48 Z" fill="#5D4037" opacity="0.3" />
          {/* Eyes */}
          <ellipse cx="43" cy="45" rx="2.5" ry="1.5" fill="#2C3E50" />
          <ellipse cx="57" cy="45" rx="2.5" ry="1.5" fill="#2C3E50" />
          {/* Eyebrows */}
          <path d="M39 40 Q43 38 47 41" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M53 41 Q57 38 61 40" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Nose */}
          <path d="M49 46 L47 52 L52 52" stroke="#D08B6B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Mouth */}
          <path d="M46 58 Q50 60 54 58" stroke="#A93226" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Black Cap / Hat (matching mockup) */}
          <path d="M26 35 C28 20 40 18 50 18 C60 18 72 20 74 35 C74 37 68 39 50 39 C32 39 26 37 26 35 Z" fill="url(#capGrad)" />
          {/* Cap Visor */}
          <path d="M24 35 C32 32 68 32 76 35 C70 41 30 41 24 35 Z" fill="#0D0D0E" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setImgError(true)}
      className={`${size} rounded-full object-cover border border-white/20 shadow-md shrink-0`}
    />
  );
}

