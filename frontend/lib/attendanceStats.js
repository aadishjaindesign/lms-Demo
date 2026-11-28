import { istDateKey } from "./istDate";

export { istDateKey };

// Shared attendance calculation so the Home card and the Attendance page show the same %.

export const ATTENDANCE_REQUIREMENT = 75; // % mandatory

export const HOLIDAYS = {
  "2026-10-02": "Gandhi Jayanti",
  "2026-10-20": "Dussehra",
  "2026-11-09": "Diwali break",
  "2026-11-10": "Diwali break",
  "2026-12-25": "Christmas",
};

const weekdayOf = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const localToday = () => istDateKey();

/**
 * Current-month attendance %, same rules as the Attendance page ring:
 * working days = every day of the month up to today except Sundays and official holidays;
 * a past working day with no record counts as absent; today counts once the student has checked in.
 * @param {Array} records  raw records from GET /student/attendance (each has date + status)
 * @param {boolean} isCheckedInToday
 */
export const computeMonthAttendance = (records = [], isCheckedInToday = false, today = localToday()) => {
  const month = today.slice(0, 7);
  const statusByDay = new Map();
  for (const rec of Array.isArray(records) ? records : []) {
    if (!rec?.date) continue;
    const dStr = istDateKey(rec.date);
    statusByDay.set(dStr, rec.status || "present");
  }

  const lastDay = parseInt(today.slice(8, 10), 10);
  let conducted = 0;
  let attended = 0;

  for (let day = 1; day <= lastDay; day++) {
    const dStr = `${month}-${String(day).padStart(2, "0")}`;
    if (weekdayOf(dStr) === 0 || HOLIDAYS[dStr]) continue;
    const status = statusByDay.get(dStr);
    if (status === "holiday") continue;

    conducted++;
    if (status === "present" || status === "late") attended++;
    else if (!status && dStr === today && isCheckedInToday) attended++;
  }

  const pct = conducted > 0 ? Math.round((attended / conducted) * 100) : 100;
  return { pct, conducted, attended, isHealthy: pct >= ATTENDANCE_REQUIREMENT };
};
