// Calendar dates in India time. Date#toISOString() is UTC, so between 00:00 and 05:30 IST
// it returns yesterday, and rows saved at IST midnight land on the previous day.
const IST_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD" of a date (default: now) in India time.
export const istDateKey = (date = new Date()) => IST_DAY.format(new Date(date));

// Adds whole years to a "YYYY-MM-DD" key (29 Feb rolls over to 1 Mar).
export const addYearsToDateKey = (key, years = 1) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y + years, m - 1, d)).toISOString().slice(0, 10);
};
