import type { AccentId, CategoryTone, PaletteId } from "./types";

export interface PaletteDef {
  id: PaletteId;
  label: string;
  note: string;
  light: [paper: string, surface: string, accent: string, ink: string];
  dark: [paper: string, surface: string, accent: string, ink: string];
}

export const PALETTES: PaletteDef[] = [
  {
    id: "garden",
    label: "باغ",
    note: "کرم و سبز مریم",
    light: ["#f4efe3", "#fcf9f1", "#3f6b57", "#223029"],
    dark: ["#111713", "#18211b", "#8fbe9c", "#ece7d9"],
  },
  {
    id: "paper",
    label: "کاغذ",
    note: "کرم گرم و زیتونی",
    light: ["#f7f0e2", "#fffaf0", "#6f7a4f", "#2c2a24"],
    dark: ["#17150f", "#221f17", "#c6cc9a", "#ece7dc"],
  },
  {
    id: "night",
    label: "شب",
    note: "سبز-مشکی و مهتاب",
    light: ["#e9edf0", "#f7f9fa", "#2f4a54", "#1d2a2e"],
    dark: ["#0d1416", "#151f22", "#9cc6c9", "#e6eef0"],
  },
  {
    id: "ocean",
    label: "اقیانوس",
    note: "خاکستری-آبی و فیروزه",
    light: ["#eef3f4", "#f9fbfb", "#3f6f7d", "#1f2f35"],
    dark: ["#0e171a", "#16262b", "#8bc0ca", "#e6f0f2"],
  },
  {
    id: "clay",
    label: "خاک رس",
    note: "خاکی گرم و سفال",
    light: ["#f6ede2", "#fdf8f1", "#9a6b4f", "#33261f"],
    dark: ["#1a1310", "#251c18", "#d9a784", "#f0e5da"],
  },
  {
    id: "sky",
    label: "آسمان",
    note: "آبی روشن و شیری",
    light: ["#eef4fb", "#fbfdff", "#3e6491", "#1e2a39"],
    dark: ["#0d1520", "#162130", "#8fb6e0", "#e8f0f9"],
  },
  {
    id: "dracula",
    label: "دراکولا",
    note: "بنفش روی شبِ کبود",
    light: ["#f6f3fb", "#fdfcff", "#7d3ec9", "#2a2140"],
    dark: ["#282a36", "#343746", "#bd93f9", "#f8f8f2"],
  },
];

export const ACCENTS: { id: AccentId; label: string; light: string; dark: string }[] = [
  { id: "green", label: "سبز", light: "#3f6b57", dark: "#8fbe9c" },
  { id: "blue", label: "آبی", light: "#4c6f8c", dark: "#9cb9d8" },
  { id: "olive", label: "زیتونی", light: "#6f7a4f", dark: "#bcc994" },
  { id: "tea", label: "فیروزه‌ای", light: "#3f7371", dark: "#8fc7c3" },
  { id: "amber", label: "کهربایی", light: "#8a6528", dark: "#dcc084" },
  { id: "violet", label: "بنفش", light: "#6d35b8", dark: "#bd93f9" },
];

export interface ToneDef {
  id: CategoryTone;
  label: string;
  light: string;
  dark: string;
}

export const CATEGORY_TONES: ToneDef[] = [
  { id: "green", label: "سبز", light: "#3f6b57", dark: "#8fbe9c" },
  { id: "blue", label: "آبی", light: "#4c6f8c", dark: "#9cb9d8" },
  { id: "olive", label: "زیتونی", light: "#6f7a4f", dark: "#bcc994" },
  { id: "tea", label: "فیروزه‌ای", light: "#3f7371", dark: "#8fc7c3" },
  { id: "clay", label: "سفالی", light: "#9a6b4f", dark: "#d9a784" },
  { id: "gold", label: "طلایی", light: "#8a6528", dark: "#dcc084" },
  { id: "stone", label: "سنگی", light: "#6f6a5e", dark: "#b7b1a3" },
];
