"use client";

/**
 * Registers the service worker. Renders nothing.
 *
 * Deliberately quiet: if registration fails the tuner still works, it just
 * will not work offline, and there is nothing useful to tell the user about
 * that in the moment.
 */

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Wait for load so registration never competes with first paint.
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
