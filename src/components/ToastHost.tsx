"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUIStore } from "@/lib/ui-store";
import { Icon } from "./Icon";

export function ToastHost() {
  const toast = useUIStore((s) => s.toast);
  const dismiss = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, 3400);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <span
              className="grid h-6 w-6 place-items-center rounded-full"
              style={{ background: "var(--green-soft)", color: "var(--green-deep)" }}
            >
              <Icon name="leaf" size={13} />
            </span>
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
