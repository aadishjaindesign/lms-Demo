"use client";

import { useEffect, useState } from "react";

export default function PwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        // In dev a service worker serves stale chunks and breaks rendering: remove any old one
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
        if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
      }
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("pwa_install_dismissed") === "1";
    } catch (e) {}
    if (standalone || dismissed) return;

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (!isMobile) return;

    if (isIos) {
      setShowIos(true);
      setHidden(false);
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem("pwa_install_dismissed", "1");
    } catch (e) {}
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <div className="md:hidden fixed left-3 right-3 bottom-24 z-[60] rounded-[12px] bg-[#1C1C1E] border border-white/15 shadow-2xl p-3 flex items-center gap-3 text-white">
      <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-[8px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">Install Jains LMS app</p>
        <p className="text-[11px] text-gray-400 leading-snug">
          {showIos && !deferred
            ? "Tap Share, then “Add to Home Screen”."
            : "Open it like a real app, full screen."}
        </p>
      </div>
      {deferred && (
        <button onClick={install} className="px-3 py-2 rounded-[8px] bg-[#D71D3A] text-xs font-bold shrink-0">
          Install
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss" className="text-gray-400 px-1 text-lg leading-none shrink-0">
        ✕
      </button>
    </div>
  );
}
