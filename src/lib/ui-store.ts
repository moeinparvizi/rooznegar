"use client";

import { create } from "zustand";

export type OverlayName = "focus" | "commute" | "review" | null;

export interface ToastMessage {
  id: number;
  message: string;
}

interface UIState {
  overlay: OverlayName;
  focusCategory: "language" | "programming" | "free";
  focusLength: 25 | 50;
  toast: ToastMessage | null;
  openFocus: (
    category?: "language" | "programming" | "free",
    length?: 25 | 50,
  ) => void;
  openCommute: () => void;
  openReview: () => void;
  closeOverlay: () => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  overlay: null,
  focusCategory: "language",
  focusLength: 25,
  toast: null,
  openFocus: (category = "language", length = 25) =>
    set({ overlay: "focus", focusCategory: category, focusLength: length }),
  openCommute: () => set({ overlay: "commute" }),
  openReview: () => set({ overlay: "review" }),
  closeOverlay: () => set({ overlay: null }),
  showToast: (message) =>
    set({ toast: { id: Date.now(), message } }),
  dismissToast: () => set({ toast: null }),
}));
