// Browser geolocation helper used for attendance punch in/out.
// Resolves to { latitude, longitude, accuracy } or rejects with an Error whose message is user-friendly.

// Phones report a rough Wi-Fi/cell fix first (often 100-300 m off) and a GPS lock a few seconds later,
// so watch the position for up to `timeout` ms and keep the most accurate fix. Stops early once the
// fix is good enough (`goodAccuracy` metres).
export const getCurrentLocation = ({ timeout = 12000, goodAccuracy = 30 } = {}) =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Your browser does not support location. Please use a modern browser on your phone."));
      return;
    }
    if (!window.isSecureContext) {
      reject(new Error("Location needs a secure (https) connection. Please open the portal over https."));
      return;
    }

    let best = null;
    let done = false;
    let watchId = null;
    let timer = null;

    const finish = (err) => {
      if (done) return;
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(err || new Error("Getting your location took too long. Please turn on GPS and try again."));
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
        };
        if (!best || fix.accuracy <= best.accuracy) best = fix;
        if (best.accuracy <= goodAccuracy) finish();
      },
      (err) => {
        if (err.code === 1) {
          finish(new Error("Location permission denied. Please allow location access in your browser settings to punch attendance."));
        } else if (err.code !== 3 && !best) {
          finish(new Error("Could not detect your location. Please turn on GPS / location and try again."));
        }
        // timeout (code 3) / transient errors: keep waiting for our own timer
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );

    timer = setTimeout(() => finish(), timeout);
  });

// Fetch location only if the admin has enabled the geofence; returns {} when not needed.
// `onStatus` (optional) receives the campus status for the fix, so the page chip stays in sync.
export const getPunchLocationPayload = async (fetchApi, onStatus) => {
  let fence = null;
  try {
    const res = await fetchApi("/student/attendance/geofence", { skipCache: true });
    if (res.ok) fence = await res.json();
  } catch (e) {}

  // If the setting can't be loaded, still try to send location so the backend can validate.
  if (fence && !fence.enabled) return {};

  try {
    const { latitude, longitude, accuracy } = await getCurrentLocation();
    if (fence) onStatus?.(evaluateCampus(fence, { latitude, longitude, accuracy }));
    return { latitude, longitude, accuracy };
  } catch (err) {
    if (fence?.enabled) onStatus?.({ state: "error", message: err.message });
    if (fence?.enabled) throw err;
    return {};
  }
};

// ---------------------------------------------------------------------------
// Live "On campus" status for the attendance page. Uses the same rule as the backend
// (backend/src/services/geofenceService.js) so the chip matches what a punch would do.
// ---------------------------------------------------------------------------
const MAX_ACCURACY_METERS = 200;
const MAX_TOLERANCE_METERS = 150;

export const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/**
 * Status for a fix against the fence:
 * { state: "on" | "off" | "low", distance, accuracy } — or { state: "disabled" } when no fence is set.
 */
export const evaluateCampus = (fence, fix) => {
  if (!fence?.enabled || !Number.isFinite(fence.latitude) || !Number.isFinite(fence.longitude)) {
    return { state: "disabled" };
  }
  const accuracy = Number(fix?.accuracy);
  const distance = Math.round(distanceMeters(fix.latitude, fix.longitude, fence.latitude, fence.longitude));
  if (Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_METERS) return { state: "low", distance, accuracy };
  const tolerance = Number.isFinite(accuracy) && accuracy > 0 ? Math.min(accuracy, MAX_TOLERANCE_METERS) : 0;
  return { state: distance - tolerance > fence.radiusMeters ? "off" : "on", distance, accuracy };
};

export const fetchGeofence = async (fetchApi) => {
  try {
    const res = await fetchApi("/student/attendance/geofence", { skipCache: true });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
};

/** Detects the student's location and evaluates it. Never throws: errors become { state: "error", message }. */
export const getCampusStatus = async (fetchApi) => {
  const fence = await fetchGeofence(fetchApi);
  if (!fence) return { state: "unknown" };
  if (!fence.enabled) return { state: "disabled" };
  try {
    const fix = await getCurrentLocation();
    return evaluateCampus(fence, fix);
  } catch (err) {
    return { state: "error", message: err.message };
  }
};
