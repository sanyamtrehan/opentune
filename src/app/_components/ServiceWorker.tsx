"use client";

/**
 * Registers the service worker in production, and makes sure one is *not*
 * running in development.
 *
 * The dev case is not hypothetical. This registered unconditionally, so a
 * `localhost` visit installed a cache-first worker, and from then on the
 * browser served whatever JS and CSS it had cached — Turbopack reuses asset
 * URLs between rebuilds in dev, so the cache never invalidated. The result is
 * current markup wearing stale styles, which looks exactly like badly broken
 * CSS and is invisible to anyone testing in a fresh profile.
 *
 * So in development it actively unregisters and clears, rather than merely
 * not registering: the worker outlives the code change that stops installing
 * it, and every machine that already has one needs a way out.
 */

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        for (const registration of registrations) await registration.unregister();
        if (typeof caches !== "undefined") {
          for (const key of await caches.keys()) await caches.delete(key);
        }
        if (registrations.length > 0) {
          // A page already holding stale assets keeps them until it reloads.
          console.info("[opentune] removed a development service worker — reloading");
          window.location.reload();
        }
      });
      return;
    }

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
