"use client";

import { useEffect } from "react";
import { asset } from "@/lib/site";
import { registerInstallListener } from "@/lib/pwa";

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
    const register = () => {
      navigator.serviceWorker
        .register(asset("/sw.js"), { scope: asset("/") })
        .catch(() => {
          /* offline cache is a bonus, not a requirement */
        });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
