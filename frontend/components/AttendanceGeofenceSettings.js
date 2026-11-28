"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { getCurrentLocation } from "@/lib/geolocation";

const inputCls =
  "w-full bg-black/60 border border-white/15 rounded-[8px] px-3 py-2.5 text-sm font-semibold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 font-mono";
const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5";

export default function AttendanceGeofenceSettings({ onNotice }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectInfo, setDetectInfo] = useState("");
  const [form, setForm] = useState({ enabled: false, latitude: "", longitude: "", radiusMeters: 100 });
  const [saved, setSaved] = useState(null);

  const notify = (type, msg) => onNotice?.(type, msg);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi("/admin/attendance/geofence");
        if (res.ok) {
          const data = await res.json();
          setSaved(data);
          setForm({
            enabled: Boolean(data.enabled),
            latitude: data.latitude ?? "",
            longitude: data.longitude ?? "",
            radiusMeters: data.radiusMeters ?? 100,
          });
        }
      } catch (e) {
        console.error("Geofence load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleDetect = async () => {
    setDetecting(true);
    setDetectInfo("");
    try {
      const { latitude, longitude, accuracy } = await getCurrentLocation({ timeout: 20000, goodAccuracy: 15 });
      setForm((f) => ({ ...f, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) }));
      setDetectInfo(
        accuracy > 100
          ? `Detected with ±${accuracy} m accuracy — low. For best results detect from a phone with GPS inside the institute.`
          : `Detected with ±${accuracy} m accuracy.`
      );
    } catch (err) {
      notify("error", err.message);
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchApi("/admin/attendance/geofence", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.enabled,
          latitude: form.latitude === "" ? null : Number(form.latitude),
          longitude: form.longitude === "" ? null : Number(form.longitude),
          radiusMeters: Number(form.radiusMeters),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save location settings");
      setSaved(data);
      notify(
        "success",
        data.enabled
          ? `Location restriction ON — students can punch only within ${data.radiusMeters} m.`
          : "Location restriction OFF — students can punch from anywhere."
      );
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasCoords = form.latitude !== "" && form.longitude !== "";
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${form.latitude},${form.longitude}`)}`
    : null;

  return (
    <div className="bg-[#1C1818]/90 border border-white/10 rounded-[8px] shadow-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 shrink-0 rounded-[8px] bg-[#8D0E1F]/30 border border-red-500/30 flex items-center justify-center text-red-300">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">Attendance Location Restriction</div>
            <div className="text-[11px] text-gray-400 truncate">
              {loading
                ? "Loading…"
                : saved?.enabled
                ? `ON · Students must be within ${saved.radiusMeters} m of the institute to punch in/out`
                : "OFF · Students can punch from anywhere"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              saved?.enabled
                ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                : "text-gray-400 border-white/15 bg-white/5"
            }`}
          >
            {saved?.enabled ? "Active" : "Off"}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-red-600"
            />
            <span>
              <span className="block text-sm font-semibold text-white">Restrict punch in/out to institute location</span>
              <span className="block text-[11px] text-gray-400">
                Students can punch attendance only when they are within the radius below.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-gray-400">
              Tip: open this page on a phone while standing inside the institute and tap Detect.
            </p>
            <button
              type="button"
              onClick={handleDetect}
              disabled={detecting}
              className="px-3 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-bold rounded-[8px] border border-white/10 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {detecting ? "Detecting…" : "Detect My Location"}
            </button>
          </div>
          {detectInfo && <p className="text-[11px] text-amber-300/90 -mt-2">{detectInfo}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="geo-lat">Office Latitude</label>
              <input
                id="geo-lat"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="26.940500"
                value={form.latitude}
                onChange={(e) => update("latitude", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="geo-lng">Office Longitude</label>
              <input
                id="geo-lng"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="75.752878"
                value={form.longitude}
                onChange={(e) => update("longitude", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="geo-radius">Allowed Radius (meters)</label>
            <input
              id="geo-radius"
              type="number"
              min={10}
              max={5000}
              step={10}
              value={form.radiusMeters}
              onChange={(e) => update("radiusMeters", e.target.value)}
              className={inputCls}
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
              Allowed distance from the coordinates (10 – 5000 m). 100 m is recommended; phone GPS can be off by 10–50 m.
            </p>
          </div>

          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-semibold text-red-300 hover:text-white">
              Check this point on Google Maps ↗
            </a>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="sm:flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-bold rounded-[8px] border border-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="sm:flex-1 px-4 py-2.5 bg-[#D71D3A] hover:bg-[#e3243f] disabled:opacity-60 text-white text-sm font-bold rounded-[8px] shadow-md"
            >
              {saving ? "Saving…" : "✓ Save Location Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
