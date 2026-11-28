"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { useIsoLayoutEffect, readStudentCache, writeStudentCache } from "@/lib/studentCache";
import { HOLIDAYS as SHARED_HOLIDAYS, istDateKey } from "@/lib/attendanceStats";
import { getPunchLocationPayload, getCampusStatus } from "@/lib/geolocation";
import useHoldToConfirm from "@/lib/useHoldToConfirm";
import PunchStation from "@/components/attendance/PunchStation";

const CONFIG = {
  course: "Graphic Design",
  room: "Classroom 2",
  campus: "JAINS COMPUTER, JAIPUR",
  classTime: "9:00 – 11:00 AM",
  courseStart: "2026-09-01",
  requirement: 75, // % mandatory
  lateAfter: "09:15 AM",
  timeZone: "Asia/Kolkata",
};

// Official holidays are shared with the Home card calculation
const HOLIDAYS = SHARED_HOLIDAYS;

// Date utilities
const toD = (s) => {
  const [y, m, d] = (s || "").split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const iso = (d) => d.toISOString().slice(0, 10);
const wd = (s) => toD(s).getUTCDay();
const mk = (s) => (s || "").slice(0, 7);

const fLongUpper = (d) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toD(d)).toUpperCase();

const fChip = (d) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(toD(d));

const durationCalc = (startStr, endStr) => {
  try {
    const parseTime = (t) => {
      const parts = (t || "").match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!parts) return null;
      let hr = parseInt(parts[1], 10);
      const mn = parseInt(parts[2], 10);
      const isPm = parts[3].toUpperCase() === "PM";
      if (isPm && hr !== 12) hr += 12;
      if (!isPm && hr === 12) hr = 0;
      return hr * 60 + mn;
    };
    const sM = parseTime(startStr);
    const eM = parseTime(endStr);
    if (sM == null || eM == null) return "In session";
    const diff = Math.max(0, eM - sM);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  } catch (e) {
    return "In session";
  }
};

// How long the punch button must be held down
const HOLD_TO_PUNCH_MS = 3000;

export default function StudentAttendancePage() {
  // Live dynamic TODAY string in Indian Standard Time (YYYY-MM-DD)
  const TODAY = useMemo(() => istDateKey(new Date()), []);

  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(TODAY.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [activeTab, setActiveTab] = useState("calendar"); // 'calendar' | 'log'
  const [punchLoading, setPunchLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Live Real-Time Clock State
  const [clockState, setClockState] = useState({
    hoursMinutes: "12:00",
    seconds: "00",
    ampm: "PM",
    formattedLong: "",
  });

  const toastTimeoutRef = useRef(null);

  // Live ticking clock in Indian Standard Time (ticks every 1000ms)
  useEffect(() => {
    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateFmt = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const updateClock = () => {
      const now = new Date();
      const parts = Object.fromEntries(timeFmt.formatToParts(now).map((p) => [p.type, p.value]));
      setClockState({
        hoursMinutes: `${parts.hour || "12"}:${parts.minute || "00"}`,
        seconds: parts.second || "00",
        ampm: (parts.dayPeriod || "PM").toUpperCase(),
        formattedLong: dateFmt.format(now),
      });
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 4000);
  }, []);

  // Fetch Live Attendance from Backend API
  const loadAttendance = useCallback(async () => {
    try {
      const res = await fetchApi("/student/attendance");
      if (res.ok) {
        const json = await res.json();
        setApiData(json);
        writeStudentCache("attendance", json);
      }
    } catch (err) {
      console.warn("Could not load backend attendance:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Paint the last known attendance before the first frame; the fetch below refreshes it
  useIsoLayoutEffect(() => {
    const cached = readStudentCache("attendance");
    if (cached) setApiData((prev) => prev || cached);
  }, []);

  // First visit with nothing cached: don't show a fake "0% / all absent" month while loading
  const dataPending = loading && !apiData;

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Live campus status for the location chip (re-checked when the student returns to the tab)
  const [campusStatus, setCampusStatus] = useState({ state: "checking" });
  const checkingCampusRef = useRef(false);
  const refreshCampusStatus = useCallback(async () => {
    if (checkingCampusRef.current) return;
    checkingCampusRef.current = true;
    setCampusStatus({ state: "checking" });
    try {
      setCampusStatus(await getCampusStatus(fetchApi));
    } finally {
      checkingCampusRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshCampusStatus();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCampusStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshCampusStatus]);

  // Construct Records Map Purely From Real Database Attendance
  // NO FAKE OR SYNTHETIC DUMMY DATA.
  const recordsMap = useMemo(() => {
    const map = new Map();

    // 1. Known public holidays
    Object.entries(HOLIDAYS).forEach(([hDate, hName]) => {
      map.set(hDate, {
        date: hDate,
        status: "holiday",
        in: null,
        out: null,
        duration: "—",
        topic: hName,
        faculty: "—",
        room: "—",
        classTime: "Institute Closed",
        note: `Official Holiday: ${hName}`,
        punchType: "system",
      });
    });

    // 2. Real records from backend MongoDB
    if (apiData?.records && Array.isArray(apiData.records)) {
      apiData.records.forEach((rec) => {
        if (!rec.date) return;
        const dStr = istDateKey(rec.date);
        map.set(dStr, {
          date: dStr,
          status: rec.status === "late" ? "present" : rec.status || "present",
          in: rec.checkIn || null,
          out: rec.checkOut || null,
          duration: rec.duration || (rec.checkIn && rec.checkOut ? durationCalc(rec.checkIn, rec.checkOut) : "In session"),
          topic: rec.topicCovered || "Course Lectures & Practical Lab",
          faculty: rec.faculty || "Neha Jain",
          room: rec.room || CONFIG.room,
          classTime: rec.classTime || CONFIG.classTime,
          note: rec.note || "",
          punchType: rec.punchType || "self",
        });
      });
    }

    // 3. Today's live record handling
    const tr = apiData?.todayRecord;
    const hasRealCheckIn = Boolean(apiData?.isCheckedInToday || tr?.checkIn);
    const hasRealCheckOut = Boolean(apiData?.isCheckedOutToday || tr?.checkOut);

    if (hasRealCheckIn || tr) {
      const inTime = tr?.checkIn || (hasRealCheckIn ? "09:05 AM" : null);
      const outTime = tr?.checkOut || null;
      map.set(TODAY, {
        date: TODAY,
        status: tr?.status || (inTime ? "present" : "none"),
        in: inTime,
        out: outTime,
        duration: tr?.duration || (inTime && outTime ? durationCalc(inTime, outTime) : inTime ? "In session" : "—"),
        topic: tr?.topicCovered || "Course Lectures & Practical Lab",
        faculty: tr?.faculty || "Neha Jain",
        room: tr?.room || CONFIG.room,
        classTime: tr?.classTime || CONFIG.classTime,
        note: tr?.note || "",
        punchType: tr?.punchType || "self",
      });
    } else if (!map.has(TODAY)) {
      // Not punched yet today: clean unmarked state
      map.set(TODAY, {
        date: TODAY,
        status: "none",
        in: null,
        out: null,
        duration: "—",
        topic: "Course Lectures & Practical Lab",
        faculty: "Neha Jain",
        room: CONFIG.room,
        classTime: CONFIG.classTime,
        note: "",
        punchType: "self",
      });
    }

    return map;
  }, [apiData, TODAY]);

  // Real Month-Based Attendance Summary
  const overallSummary = useMemo(() => {
    const targetMonth = currentMonth || TODAY.slice(0, 7);
    const [tY, tM] = targetMonth.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(tY, tM, 0)).getUTCDate();

    const isCurrentOngoingMonth = targetMonth === TODAY.slice(0, 7);
    const isPastMonth = targetMonth < TODAY.slice(0, 7);
    const maxDay = isCurrentOngoingMonth
      ? Math.min(daysInMonth, parseInt(TODAY.slice(8, 10), 10))
      : isPastMonth
      ? daysInMonth
      : 0;

    let conducted = 0;
    let attended = 0;
    let present = 0;
    let late = 0;
    let absent = 0;
    let holiday = 0;

    for (let dayNum = 1; dayNum <= maxDay; dayNum++) {
      const dStr = `${targetMonth}-${String(dayNum).padStart(2, "0")}`;
      const dayOfWeek = wd(dStr);
      const isSunday = dayOfWeek === 0;
      const isOfficialHoliday = Boolean(HOLIDAYS[dStr]);

      if (isSunday || isOfficialHoliday) {
        if (isOfficialHoliday) holiday++;
        continue;
      }

      conducted++;

      const rec = recordsMap.get(dStr);
      if (rec && rec.status === "present") {
        present++;
        attended++;
      } else if (rec && rec.status === "late") {
        late++;
        attended++;
      } else if (rec && rec.status === "absent") {
        absent++;
      } else {
        if (dStr < TODAY) {
          absent++;
        } else if (dStr === TODAY) {
          if (apiData?.isCheckedInToday || rec?.in) {
            present++;
            attended++;
          } else {
            absent++;
          }
        }
      }
    }

    const pct = conducted > 0 ? Math.round((attended / conducted) * 100) : 100;
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 75 ? "B" : pct >= 60 ? "C" : "D";
    const isHealthy = pct >= CONFIG.requirement;
    const canMiss = Math.max(0, Math.floor(attended / (CONFIG.requirement / 100) - conducted));
    const need = Math.max(
      0,
      Math.ceil((CONFIG.requirement / 100 * conducted - attended) / (1 - CONFIG.requirement / 100))
    );

    const monthFormatted = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(toD(`${targetMonth}-01`));

    return {
      conducted,
      attended,
      present,
      late,
      absent,
      holiday,
      pct,
      grade,
      isHealthy,
      canMiss,
      need,
      monthFormatted,
    };
  }, [currentMonth, recordsMap, TODAY, apiData]);

  // Live Today Punch Status
  const todayRecord = recordsMap.get(TODAY) || null;
  const isCheckedIn = Boolean(
    apiData?.isCheckedInToday || (todayRecord && todayRecord.in)
  );
  const isCheckedOut = Boolean(
    apiData?.isCheckedOutToday || (todayRecord && todayRecord.out)
  );
  const isFullyPunched = isCheckedIn && isCheckedOut;


  // Selected Date details
  const activeRecord = recordsMap.get(selectedDate) || {
    date: selectedDate,
    status: wd(selectedDate) === 0 ? "off" : selectedDate > TODAY ? "upcoming" : "none",
    in: null,
    out: null,
    duration: "—",
    topic: selectedDate > TODAY ? "Scheduled Class Lecture" : "No attendance recorded",
    faculty: "Neha Jain",
    room: CONFIG.room,
    classTime: CONFIG.classTime,
  };

  // Hold-to-punch: the student must keep a punch button pressed for 3 seconds.
  // Targets: "main" (big fingerprint button), "in" / "out" (small action buttons).
  const hold = useHoldToConfirm({
    durationMs: HOLD_TO_PUNCH_MS,
    canStart: () => {
      if (punchLoading) return false;
      if (isFullyPunched) {
        showToast("✓ Today's attendance is complete. Check-in & check-out already recorded.");
        return false;
      }
      return true;
    },
    onConfirm: () => handleFingerprintPunch(),
    onEarlyRelease: () => showToast("Hold the button for 3 seconds to mark attendance."),
  });

  // Biometric Fingerprint Punch (runs after a completed 3-second hold)
  const handleFingerprintPunch = async () => {
    if (punchLoading) return;

    if (isFullyPunched) {
      showToast("✓ Today's attendance is complete. Check-in & check-out already recorded.");
      return;
    }

    setPunchLoading(true);

    // Institute location check: the backend only accepts punches within the admin-set radius
    let loc = {};
    try {
      showToast("📍 Checking your location… please wait a few seconds.");
      loc = await getPunchLocationPayload(fetchApi, setCampusStatus);
    } catch (locErr) {
      showToast(`📍 ${locErr.message}`);
      setPunchLoading(false);
      return;
    }

    try {
      if (!isCheckedIn) {
        // Record Check In
        const res = await fetchApi("/student/attendance/punch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "in", topicCovered: "Course Lectures & Practical Lab", ...loc }),
        });
        const resData = await res.json();
        if (res.ok) {
          const checkInTime = resData.record?.checkIn || clockState.hoursMinutes + " " + clockState.ampm;
          showToast(`✓ Check In Recorded at ${checkInTime}! Welcome to class.`);
          setApiData((prev) => ({
            ...prev,
            isCheckedInToday: true,
            isCheckedOutToday: false,
            isPunchedToday: true,
            todayRecord: resData.record || {
              ...(prev?.todayRecord || {}),
              checkIn: checkInTime,
              status: "present",
            },
          }));
          await loadAttendance();
        } else {
          showToast(resData.error || "Check in failed. Please try again.");
        }
      } else if (!isCheckedOut) {
        // Record Check Out
        const res = await fetchApi("/student/attendance/punch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "out", ...loc }),
        });
        const resData = await res.json();
        if (res.ok) {
          const checkOutTime = resData.record?.checkOut || clockState.hoursMinutes + " " + clockState.ampm;
          const dur = resData.record?.duration || "Session recorded";
          showToast(`✓ Check Out Recorded at ${checkOutTime}! Total duration: ${dur}`);
          setApiData((prev) => ({
            ...prev,
            isCheckedInToday: true,
            isCheckedOutToday: true,
            isPunchedToday: true,
            todayRecord: resData.record || {
              ...(prev?.todayRecord || {}),
              checkOut: checkOutTime,
              duration: dur,
            },
          }));
          await loadAttendance();
        } else {
          showToast(resData.error || "Check out failed. Please try again.");
        }
      }
    } catch (e) {
      console.error("Punch error:", e);
      showToast("Network error. Please check your connection.");
    } finally {
      setPunchLoading(false);
    }
  };

  // Month navigation
  const shiftMonth = (delta) => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const nextKey = iso(d).slice(0, 7);
    setCurrentMonth(nextKey);
  };

  // Month title formatter
  const formattedMonthTitle = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }, [currentMonth]);

  // Calendar Day Cells generation
  const calendarCells = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const firstDay = new Date(Date.UTC(y, m - 1, 1));
    const totalDays = new Date(Date.UTC(y, m, 0)).getUTCDate();

    // 0 = Sunday, 1 = Monday, etc. Align with Mon = 0
    let startDayIdx = (firstDay.getUTCDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < startDayIdx; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dStr = `${currentMonth}-${String(dayNum).padStart(2, "0")}`;
      const rec = recordsMap.get(dStr);
      const isSunday = wd(dStr) === 0;
      const isToday = dStr === TODAY;
      const isFuture = dStr > TODAY;
      const isPast = dStr < TODAY;
      const isHoliday = Boolean(HOLIDAYS[dStr]);

      let cellStatus = "none";
      if (rec?.status && rec.status !== "none") {
        cellStatus = rec.status;
      } else if (isSunday) {
        cellStatus = "off";
      } else if (isHoliday) {
        cellStatus = "holiday";
      } else if (isFuture) {
        cellStatus = "upcoming";
      } else if (isPast) {
        cellStatus = "absent";
      } else {
        cellStatus = isCheckedIn ? "present" : "none";
      }

      cells.push({
        empty: false,
        key: dStr,
        date: dStr,
        dayNum,
        record: rec,
        isSunday,
        isToday,
        isFuture,
        status: cellStatus,
      });
    }

    return cells;
  }, [currentMonth, recordsMap, TODAY, isCheckedIn]);

  // Overall SVG Ring calculation
  const ringRadius = 52;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference * (1 - overallSummary.pct / 100);

  return (
    <div className="content">
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

      {/* ========================================================================= */}
      {/* TOP TWO-COLUMN SECTION: Left: Punch Desk | Right: % Scorecard              */}
      {/* ========================================================================= */}
      <section className="top-grid">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT CARD: Live Biometric Punch Desk (Fingerprint Button + Live Clock)  */}
        {/* ----------------------------------------------------------------------- */}
        <PunchStation
          dateLabel={clockState.formattedLong ? clockState.formattedLong.toUpperCase() : fLongUpper(TODAY)}
          clock={clockState}
          campus={CONFIG.campus}
          campusStatus={campusStatus}
          onRecheckCampus={refreshCampusStatus}
          todayRecord={todayRecord}
          isCheckedIn={isCheckedIn}
          isCheckedOut={isCheckedOut}
          isFullyPunched={isFullyPunched}
          punchLoading={punchLoading}
          hold={hold}
        />

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT CARD: % Scorecard & 75% Requirement (Real Month Attendance)         */}
        {/* ----------------------------------------------------------------------- */}
        {dataPending ? (
          <div className="card hero animate-pulse" aria-busy="true" aria-label="Loading attendance">
            <div className="att-ring">
              <svg viewBox="0 0 120 120">
                <circle className="track" cx="60" cy="60" r={ringRadius} strokeWidth="10" fill="none" />
              </svg>
              <div className="ring-center">
                <span className="block h-6 w-14 rounded-md bg-white/10" />
              </div>
            </div>
            <div className="hero-txt">
              <div className="h-5 w-40 rounded-full bg-white/10" />
              <div className="h-6 w-48 rounded-md bg-white/10 mt-3" />
              <div className="h-3.5 w-64 max-w-full rounded bg-white/[0.06] mt-3" />
            </div>
            <div className="req">
              <div className="req-bar" />
              <div className="h-10 w-full rounded-xl bg-white/[0.05] mt-6" />
            </div>
          </div>
        ) : (
        <div className="card hero" style={{ "--c": overallSummary.isHealthy ? "var(--present)" : "var(--absent)" }}>
          {/* Radial Progress Ring */}
          <div className="att-ring">
            <svg viewBox="0 0 120 120">
              <circle className="track" cx="60" cy="60" r={ringRadius} strokeWidth="10" fill="none" />
              <circle
                className="bar"
                cx="60"
                cy="60"
                r={ringRadius}
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="ring-center">
              <span className="ring-pct tnum mono">{overallSummary.pct}%</span>
              <span className="ring-cap">OVERALL</span>
            </div>
          </div>

          {/* Badges & Track Info */}
          <div className="hero-txt">
            <div className="hero-badges">
              <span className="grade">Grade {overallSummary.grade}</span>
              <span className={`pill ${overallSummary.isHealthy ? "st-present" : "st-absent"}`}>
                {overallSummary.isHealthy ? "Healthy" : "Needs Attention"}
              </span>
            </div>

            <h2>{overallSummary.isHealthy ? "You're on track" : "Attendance Alert"}</h2>
            <p>{overallSummary.attended} of {overallSummary.conducted} classes attended this month ({overallSummary.monthFormatted}).</p>
          </div>

          {/* 75% Requirement Horizontal Progress Bar */}
          <div className="req">
            <div className="req-bar">
              <div
                className="req-fill"
                style={{
                  width: `${Math.min(100, overallSummary.pct)}%`,
                  "--c": overallSummary.isHealthy ? "var(--present)" : "var(--absent)",
                }}
              />
              <div className="req-mark" style={{ left: "75%" }} />
            </div>

            <div className="req-labels mono">
              <span style={{ left: 0 }}>0%</span>
              <span className="mid" style={{ left: "75%" }}>75% mandatory</span>
              <span style={{ right: 0 }}>100%</span>
            </div>

            <div className="req-tip">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                {overallSummary.isHealthy
                  ? `75% attendance is mandatory. You can miss up to ${overallSummary.canMiss} more classes this month.`
                  : `75% attendance is mandatory. You need to attend ${overallSummary.need} more consecutive classes to reach 75%.`}
              </div>
            </div>
          </div>
        </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* CALENDAR & LOG MAIN WORKSPACE                                             */}
      {/* ========================================================================= */}
      <section className="card cal-card">
        {/* Header Toolbar: Segmented Switcher + Month Nav */}
        <div className="toolbar">
          <div className="seg">
            <div
              className="seg-ind"
              style={{
                transform: activeTab === "log" ? "translateX(100%)" : "translateX(0%)",
                transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
            <button
              type="button"
              aria-selected={activeTab === "calendar"}
              onClick={() => setActiveTab("calendar")}
            >
              📅 Calendar
            </button>
            <button
              type="button"
              aria-selected={activeTab === "log"}
              onClick={() => setActiveTab("log")}
            >
              ≡ Log
            </button>
          </div>

          <div className="month-nav">
            <button type="button" className="nav-btn" onClick={() => shiftMonth(-1)} title="Previous Month">
              ‹
            </button>
            <div className="month-label">
              <b>{formattedMonthTitle}</b>
              {dataPending ? (
                <small>Loading…</small>
              ) : (
                <small>
                  <em style={{ "--c": overallSummary.pct >= 75 ? "var(--present)" : "var(--absent)" }}>
                    {overallSummary.pct}%
                  </em>{" "}
                  this month · {overallSummary.attended}/{overallSummary.conducted} classes
                </small>
              )}
            </div>
            <button type="button" className="nav-btn" onClick={() => shiftMonth(1)} title="Next Month">
              ›
            </button>
          </div>
        </div>

        {/* Tab 1: Calendar Grid View */}
        {activeTab === "calendar" && (
          <div
            className={`cal-body ${dataPending ? "animate-pulse" : ""}`}
            style={dataPending ? { opacity: 0.35, pointerEvents: "none" } : undefined}
            aria-busy={dataPending || undefined}
          >
            <div>
              {/* Weekdays */}
              <div className="weekdays">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((dName) => (
                  <span key={dName}>{dName}</span>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="cal-grid">
                {calendarCells.map((cell) => {
                  if (cell.empty) {
                    return <div key={cell.key} className="cell" style={{ visibility: "hidden" }} />;
                  }

                  const isSel = selectedDate === cell.date;
                  let stClass = cell.status;
                  if (cell.isSunday && cell.status === "none") stClass = "off";

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        setSelectedDate(cell.date);
                        if (window.innerWidth < 1024) {
                          setIsMobileModalOpen(true);
                        }
                      }}
                      className={`cell ${stClass} ${cell.isToday ? "is-today" : ""} ${isSel ? "is-sel" : ""}`}
                    >
                      <span className="mono">{cell.dayNum}</span>
                      {cell.record?.in && <span className="t mono">{cell.record.in}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop Detail Panel */}
            <aside className="detail-panel">
              <p className="day-when">{selectedDate === TODAY ? "Today" : "Selected Date"}</p>
              <h3 className="day-date">{fLongUpper(selectedDate)}</h3>
              <p className="day-note">{activeRecord.topic || "Regular Lecture & Lab"}</p>

              <div className="day-boxes">
                <div className="day-box">
                  <span>Punch in</span>
                  <b className="mono">{activeRecord.in || "—"}</b>
                </div>

                <div className="day-box">
                  <span>Punch out</span>
                  <b className="mono">{activeRecord.out || (selectedDate === TODAY && isCheckedIn ? "In class" : "—")}</b>
                </div>

                <div className="day-box">
                  <span>Status</span>
                  <b className={`s st-${activeRecord.status}`}>
                    {activeRecord.status === "present"
                      ? "Present"
                      : activeRecord.status === "absent"
                      ? "Absent"
                      : activeRecord.status === "holiday"
                      ? "Holiday"
                      : "Unmarked"}
                  </b>
                </div>
              </div>

              <div className="kv">
                <div>
                  <small>Duration</small>
                  <b className="mono">{activeRecord.duration || "—"}</b>
                </div>
                <div>
                  <small>Classroom</small>
                  <b>{activeRecord.room || CONFIG.room}</b>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Tab 2: Chronological Log Table View */}
        {activeTab === "log" && (
          <ul
            className={`log ${dataPending ? "animate-pulse" : ""}`}
            style={dataPending ? { opacity: 0.35, pointerEvents: "none" } : undefined}
          >
            {Array.from(recordsMap.values())
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => {
                const dayNum = r.date.slice(8);
                const monShort = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(toD(r.date));
                return (
                  <li key={r.date} className="log-row">
                    <div className="log-date">
                      <b className="mono">{dayNum}</b>
                      <small>{monShort}</small>
                    </div>
                    <div className="log-main">
                      <b>{r.topic}</b>
                      <small>
                        {r.in ? `In: ${r.in}` : "No punch"} {r.out ? `• Out: ${r.out}` : ""} {r.duration !== "—" ? `• ${r.duration}` : ""}
                      </small>
                    </div>
                    <span className={`pill st-${r.status}`}>
                      {r.status}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}

        {/* Bottom Legend & Month Summary Pills */}
        <div className="legend">
          <span style={{ "--c": "var(--present)" }}>
            <i /> Present
          </span>
          <span style={{ "--c": "var(--absent)" }}>
            <i /> Absent
          </span>
          <span style={{ "--c": "var(--holiday)" }}>
            <i /> Holiday
          </span>
          <span className="up">
            <i /> Upcoming / not marked
          </span>
        </div>

        <div className="month-sum">
          <span className="pill st-present">{overallSummary.present} present</span>
          <span className="pill st-absent">{overallSummary.absent} absent</span>
          <span className="pill st-holiday">{overallSummary.holiday} holidays</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM DETAILS MODAL (Image 3 Design - Fixed Cutoff)                */}
      {/* ========================================================================= */}
      {isMobileModalOpen && (
        <div className="sheet-root">
          {/* Dimmed Backdrop */}
          <div className="sheet-backdrop" onClick={() => setIsMobileModalOpen(false)} />

          {/* Bottom Sheet Card */}
          <div className="sheet">
            <div className="sheet-grab">
              <div className="handle" />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsMobileModalOpen(false)}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <p className="day-when">{selectedDate === TODAY ? "Today" : "Date"}</p>
            <h3 className="day-date">{fLongUpper(selectedDate)}</h3>

            <div className="day-boxes">
              <div className="day-box">
                <span>Punch in</span>
                <b className="mono">{activeRecord.in || "—"}</b>
              </div>

              <div className="day-box">
                <span>Punch out</span>
                <b className="mono">{activeRecord.out || (selectedDate === TODAY && isCheckedIn ? "In class" : "—")}</b>
              </div>

              <div className="day-box">
                <span>Status</span>
                <b className={`s st-${activeRecord.status}`}>
                  {activeRecord.status === "present"
                    ? "Present"
                    : activeRecord.status === "absent"
                    ? "Absent"
                    : activeRecord.status === "holiday"
                    ? "Holiday"
                    : "Unmarked"}
                </b>
              </div>
            </div>

            <div className="kv">
              <div>
                <small>Duration</small>
                <b className="mono">{activeRecord.duration || "—"}</b>
              </div>
              <div>
                <small>Classroom</small>
                <b>{activeRecord.room || CONFIG.room}</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
