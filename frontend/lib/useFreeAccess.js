"use client";

import { useState, useEffect } from "react";

export const FREE_ACCESS_DAYS = 60;

// Fees section is locked for every student. Set to false to lock only after free access ends.
export const FEES_ALWAYS_LOCKED = true;

// True once the 60-day free access window (from account creation) has ended.
export function useFreeAccessExpired() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const info = JSON.parse(localStorage.getItem("lms_student_info") || "null");
        const start = info?.createdAt ? new Date(info.createdAt) : null;
        if (!start || isNaN(start)) return setExpired(false);
        setExpired(Date.now() >= start.getTime() + FREE_ACCESS_DAYS * 86400000);
      } catch (e) {}
    };
    check();
    window.addEventListener("student_profile_updated", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("student_profile_updated", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  return FEES_ALWAYS_LOCKED || expired;
}
