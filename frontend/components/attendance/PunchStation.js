"use client";

/**
 * Live biometric punch desk: clock, 3-second hold-to-punch fingerprint button,
 * campus chip, today's check-in/out times and the small punch-in/out buttons.
 * Purely presentational — all state and the hold logic come from the page.
 */

// Ring geometry (r=96): 603 ≈ full circumference = empty ring, 301 = half, 0 = full
const RING_EMPTY = 603;
const RING_HALF = 301;

export default function PunchStation({
  dateLabel,
  clock,
  campus,
  campusStatus,
  onRecheckCampus,
  todayRecord,
  isCheckedIn,
  isCheckedOut,
  isFullyPunched,
  punchLoading,
  hold,
}) {
  const clockState = clock;
  const stationState = isFullyPunched ? "done" : "red";

  // While the big button is held, the ring fills from its current level to full
  const ringBase = isFullyPunched ? 0 : isCheckedIn ? RING_HALF : RING_EMPTY;
  const ringOffset = hold.holdTarget === "main" ? ringBase * (1 - hold.progress) : ringBase;

  // Small buttons fill left-to-right while held
  const holdFillStyle = (target) => ({
    touchAction: "none",
    userSelect: "none",
    ...(hold.holdTarget === target && {
      backgroundImage: `linear-gradient(90deg, rgba(215,29,58,0.45) ${hold.progress * 100}%, transparent ${hold.progress * 100}%)`,
    }),
  });

  return (
    <div className="card station" data-state={stationState}>
      {/* Date & Live Clock */}
      <p className="st-date">
        {dateLabel}
      </p>

      <div className="clock">
        <span className="clk-hm mono">{clockState.hoursMinutes}</span>
        <span className="clk-s mono">{clockState.seconds}</span>
        <span className="clk-ap mono">{clockState.ampm}</span>
      </div>

      {/* Biometric Circular Button */}
      <div className="pbtn-wrap">
        <div className="aura" />
        <button
          type="button"
          className={`pbtn ${hold.holdTarget === "main" ? "is-holding" : ""}`}
          {...hold.bind("main")}
          disabled={punchLoading || isFullyPunched}
          aria-label={
            !isCheckedIn
              ? "Press and hold for 3 seconds to punch in"
              : !isCheckedOut
              ? "Press and hold for 3 seconds to punch out"
              : "Attendance completed for today"
          }
          title={
            !isCheckedIn
              ? "Hold for 3 seconds to Punch In"
              : !isCheckedOut
              ? "Hold for 3 seconds to Punch Out"
              : "Attendance completed for today"
          }
        >
          <svg className="pring" viewBox="0 0 208 208">
            <circle className="pring-track" cx="104" cy="104" r="96" />
            <circle className="pring-ticks" cx="104" cy="104" r="96" />
            <circle
              className="pring-bar"
              cx="104"
              cy="104"
              r="96"
              strokeDasharray={RING_EMPTY}
              strokeDashoffset={ringOffset}
              style={{
                transition: hold.holdTarget === "main" ? "none" : "stroke-dashoffset 0.45s ease-out",
              }}
            />
          </svg>

          <div className="pbtn-core">
            {/* Fingerprint Biometric SVG Icon */}
            <svg
              className="w-12 h-12"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* Loop-pattern ridges: core hook + nested arches with natural breaks */}
              <g transform="translate(-0.5 4)">
                <path d="M22.1 27.5V21.5A1.9 2.09 0 0 1 25.9 21.5V24" />
                <path d="M28.4 29.5Q28.7 25.5 28.7 21.5A4.7 5.17 0 0 0 19.3 21.5Q19.3 26.75 19.6 32" />
                <path d="M30.9 34.5Q31.5 28 31.5 21.5A7.5 8.25 0 0 0 26.57 13.75" />
                <path d="M24.26 13.26A7.5 8.25 0 0 0 16.5 21.5Q16.5 28.75 16.3 36" />
                <path d="M35.17 31.79Q34.27 27.04 34.27 22.29A10.3 11.33 0 1 0 13.7 21.5Q13.7 28 12.8 34.5" />
                <path d="M36.97 23.51A13.1 14.41 0 0 0 17.85 8.78" />
                <path d="M14.9 11.13A13.1 14.41 0 0 0 10.91 22Q10.91 26 9.51 30" />
                <path d="M38.74 14.95A15.9 17.49 0 0 0 9.26 14.95" />
                <path d="M39.6 24.5Q39.9 20.5 39.2 16.9" />
              </g>
            </svg>

            <b>
              {punchLoading
                ? "WAIT"
                : isFullyPunched
                ? "DONE"
                : isCheckedIn
                ? "PUNCH OUT"
                : "PUNCH IN"}
            </b>

            <small>
              {isFullyPunched
                ? "Completed"
                : hold.holdTarget === "main"
                ? `Keep holding… ${hold.secondsLeft}s`
                : "Hold 3 sec to punch"}
            </small>
          </div>
        </button>
      </div>

      {/* Campus Location Chip */}
      <div className="loc">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <b>{campus}</b>
        <CampusStatus status={campusStatus} onRecheck={onRecheckCampus} />
      </div>

      {/* Check In / Check Out Boxes */}
      <div className="times">
        <div id="tIn" className={`tcard ${todayRecord?.in ? "on" : ""}`}>
          <small>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            CHECK IN
          </small>
          <b className="mono c-ok">
            {todayRecord?.in || "—"}
          </b>
          <span>
            {todayRecord?.in
              ? "On time"
              : "Pending"}
          </span>
        </div>

        <div id="tOut" className={`tcard ${todayRecord?.out ? "on" : ""}`}>
          <small>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
            </svg>
            CHECK OUT
          </small>
          <b className="mono">
            {todayRecord?.out || (isCheckedIn ? "In class" : "--:--")}
          </b>
          <span>
            {todayRecord?.out
              ? "Completed"
              : isCheckedIn
              ? "In session"
              : "Pending"}
          </span>
        </div>
      </div>

      {/* Dual Action Buttons matching Screenshot 2 */}
      <div className="actions">
        <button
          type="button"
          className="act"
          {...hold.bind("in")}
          disabled={isCheckedIn || punchLoading || (hold.isHolding && hold.holdTarget !== "in")}
          style={holdFillStyle("in")}
        >
          <div>
            <b>PUNCH IN</b>
            <small>
              {todayRecord?.in
                ? "Completed"
                : hold.holdTarget === "in"
                ? `Keep holding… ${hold.secondsLeft}s`
                : "Hold 3 sec"}
            </small>
          </div>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <button
          type="button"
          className="act"
          {...hold.bind("out")}
          disabled={!isCheckedIn || isCheckedOut || punchLoading || (hold.isHolding && hold.holdTarget !== "out")}
          style={holdFillStyle("out")}
        >
          <div>
            <b>PUNCH OUT</b>
            <small>
              {todayRecord?.out
                ? "Completed"
                : hold.holdTarget === "out"
                ? `Keep holding… ${hold.secondsLeft}s`
                : "Hold 3 sec"}
            </small>
          </div>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Real location status under the punch button (same rule the backend applies on punch)
function CampusStatus({ status, onRecheck }) {
  const st = status?.state || "checking";
  if (st === "disabled" || st === "unknown") return null; // no location restriction set by admin

  const fmt = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
  const view = {
    checking: { cls: "loc-wait", text: "Checking location…" },
    on: { cls: "loc-ok", text: "On campus" },
    off: { cls: "loc-bad", text: `Outside campus · ${fmt(status.distance)} away` },
    low: { cls: "loc-warn", text: `Weak location (±${fmt(status.accuracy)}) · turn on GPS` },
    error: { cls: "loc-bad", text: status.message?.toLowerCase().includes("denied") ? "Location blocked" : "Location unavailable" },
  }[st] || { cls: "loc-wait", text: "Checking location…" };

  const canRetry = st !== "checking" && st !== "on";
  return (
    <span className={view.cls} title={status?.message || (canRetry ? "Tap to check again" : undefined)}>
      <i />
      {view.text}
      {canRetry && onRecheck && (
        <button type="button" onClick={onRecheck} className="loc-retry">
          Retry
        </button>
      )}
    </span>
  );
}
