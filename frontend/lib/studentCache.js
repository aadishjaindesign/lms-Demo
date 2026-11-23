"use client";

// Last-known API data for student pages ("stale-while-revalidate"): a page paints the cached
// data instantly on revisit, then replaces it with the fresh response. Entries are tagged with
// the student they belong to and wiped on login/logout, so one student never sees another's data.

import { useEffect, useLayoutEffect } from "react";

const PREFIX = "lms_pc_";
const LEGACY_KEYS = ["lms_home_cache"];

// useLayoutEffect on the client (cached data is painted before the first frame), useEffect during prerender
export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const readCachedStudent = () => {
  try {
    const raw = localStorage.getItem("lms_student_info");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const ownerOf = (s) => s?._id || s?.enrollmentNumber || s?.studentId || null;

/** Cached data for `key`, or null if absent / belongs to another student / no student is known. */
export const readStudentCache = (key) => {
  try {
    const student = readCachedStudent();
    if (!student) return null; // fresh login or logged out: don't trust anything cached
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    const owner = ownerOf(student);
    if (entry?.owner && owner && entry.owner !== owner) return null;
    return entry?.data ?? null;
  } catch (e) {
    return null;
  }
};

export const writeStudentCache = (key, data) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ owner: ownerOf(readCachedStudent()), data }));
  } catch (e) {
    // quota exceeded / storage blocked: caching is only an optimisation
  }
};

/** Remove every cached student page (call on login and logout). */
export const clearStudentCache = () => {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX) || LEGACY_KEYS.includes(k)) localStorage.removeItem(k);
    }
  } catch (e) {}
};
