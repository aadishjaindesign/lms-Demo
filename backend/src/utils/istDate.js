// Calendar-day key ("YYYY-MM-DD") in India time. Date#toISOString() is UTC, so an
// attendance row saved at IST midnight (18:30 UTC the day before) was keyed to the
// previous day.
const IST_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const istDateKey = (date) => IST_DAY.format(new Date(date));

const IST_TIME_12 = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

// Format time in 12-hour Indian Standard Time, e.g. "9:15 AM" / "1:45 PM"
export const formatIstTime12 = (date = new Date()) => IST_TIME_12.format(new Date(date));

// Start and end Date objects for the IST calendar day of `date`
export const istDayRange = (date = new Date()) => {
  const day = istDateKey(date);
  return {
    start: new Date(`${day}T00:00:00.000+05:30`),
    end: new Date(`${day}T23:59:59.999+05:30`),
  };
};

// Course access is valid through the whole expiry day (same rule as courseAccessService).
export const endOfIstDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
