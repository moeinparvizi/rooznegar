"use client";

import { create } from "zustand";

import type { Category } from "./types";

export type FocusCategory = Category | "free";

export type OverlayName = "focus" | "commute" | "review" | null;

export interface ToastMessage {
  id: number;
  message: string;
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  run: () => void;
}

interface UIState {
  overlay: OverlayName;
  focusCategory: FocusCategory;
  focusLength: 25 | 50;
  /** The way the block actually takes, so the clock never promises 25. */
  commuteMinutes: number;
  toast: ToastMessage | null;
  openFocus: (category?: FocusCategory, length?: 25 | 50) => void;
  openCommute: (minutes?: number) => void;
  openReview: () => void;
  closeOverlay: () => void;
  showToast: (message: string, action?: ToastAction) => void;
  dismissToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  overlay: null,
  focusCategory: "language",
  focusLength: 25,
  commuteMinutes: 25,
  toast: null,
  openFocus: (category = "language", length = 25) =>
    set({ overlay: "focus", focusCategory: category, focusLength: length }),
  openCommute: (minutes = 25) =>
    set({
      overlay: "commute",
      commuteMinutes: Math.max(1, Math.round(minutes)),
    }),
  openReview: () => set({ overlay: "review" }),
  closeOverlay: () => set({ overlay: null }),
  showToast: (message, action) =>
    set({ toast: { id: Date.now(), message, ...(action ? { action } : {}) } }),
  dismissToast: () => set({ toast: null }),
}));
