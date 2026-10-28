"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./Icon";

function useDialog(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    const first =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0];
    window.setTimeout(() => first?.focus(), 60);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const current = document.activeElement as HTMLElement;
      const index = items.indexOf(current);
      if (event.shiftKey && (index <= 0 || !items.includes(current))) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && (index === items.length - 1 || !items.includes(current))) {
        event.preventDefault();
        items[0].focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, []);

  return panelRef;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  eyebrow,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  eyebrow?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <SheetContent
          onClose={onClose}
          title={title}
          subtitle={subtitle}
          footer={footer}
          wide={wide}
          eyebrow={eyebrow}
        >
          {children}
        </SheetContent>
      )}
    </AnimatePresence>
  );
}

function SheetContent({
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
  eyebrow,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide: boolean;
  eyebrow?: string;
}) {
  const ref = useDialog(onClose);
  const titleId = useId();
  const descId = useId();

  const handleBackdrop = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={handleBackdrop}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        className={`sheet ${wide ? "sheet-wide" : ""}`}
        initial={{ y: 38, opacity: 0, scale: 0.99 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 28, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
      >
        <div className="sheet-grip" />
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
            <h2 id={titleId} className="sheet-title">
              {title}
            </h2>
            {subtitle && (
              <p id={descId} className="sheet-sub">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="بستن"
            data-autofocus
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6">{footer}</div>}
      </motion.div>
    </motion.div>
  );
}
