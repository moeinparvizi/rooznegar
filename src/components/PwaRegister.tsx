"use client";

import { useEffect } from "react";
import { asset } from "@/lib/site";
import { registerInstallListener } from "@/lib/pwa";
import { useUIStore } from "@/lib/ui-store";

export function PwaRegister() {
  useEffect(() => {
    const unsubscribe = registerInstallListener();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let skipped = false;
    let settled = false;
    const onControllerChange = () => {
      if (skipped && !settled) {
        settled = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const offer = (worker: ServiceWorker) => {
      useUIStore.getState().showToast("نسخه‌ی تازه آماده است.", {
        label: "همین حالا",
        run: () => {
          skipped = true;
          worker.postMessage("SKIP_WAITING");
        },
      });
    };

    const register = () => {
      navigator.serviceWorker
        .register(asset("/sw.js"), { scope: asset("/") })
        .then((registration) => {
          if (registration.waiting) offer(registration.waiting);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                offer(worker);
              }
            });
          });
          window.setTimeout(() => {
            registration.update().catch(() => {});
          }, 4000);
        })
        .catch(() => {
          /* offline cache is a bonus, not a requirement */
        });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => {
        window.removeEventListener("load", register);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      };
    }
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
