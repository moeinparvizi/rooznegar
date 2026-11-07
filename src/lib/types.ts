import type { IconName } from "@/components/Icon";

export type Category = string;

export type Mode = "early" | "late";
export type ThemeChoice = "light" | "dark" | "system";
export type Priority = 1 | 2 | 3;
/** Five levels, the same ladder the Thursday review already asks for energy. */
export type MoodValue = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  title: string;
  category: Category;
  startTime: string;
  endTime: string;
  duration: number;
  priority: Priority;
  recurring: boolean;
  movable: boolean;
  core?: boolean;
  fixed?: boolean;
  compensable?: boolean;
  note?: string;
  muscle?: string;
}

export interface BlockOverride {
  done?: boolean;
  skipped?: boolean;
  recovered?: boolean;
  movedFrom?: string;
  comment?: string;
}

export interface DayPlan {
  date: string;
  mode: Mode;
  overrides: Record<string, BlockOverride>;
  journal?: string;
  mood?: MoodValue;
  langMinutes: number;
  deepMinutes: number;
  focusBlocks: number;
  focusMinutes: number;
  linkedinPosts: number;
  linkedinComments: number;
}

export interface WeekAnswer {
  wins: string[];
  struggles: string[];
  energy: number;
  reduce: string;
  note: string;
}

export interface WeekReview {
  id: string;
  weekStart: string;
  createdAt: string;
  answers: WeekAnswer;
  targetLangMinutes: number;
  actualLangMinutes: number;
  gymCount: number;
  deepWorkHours: number;
  linkedinPosts: number;
  linkedinComments: number;
  score: number;
  notes: string;
}

export interface LinkedInIdea {
  id: string;
  text: string;
  category?: Category;
  status: "idea" | "scheduled" | "posted";
  publishAt?: string;
}

export interface Recovery {
  id: string;
  taskId: string;
  title: string;
  category: Category;
  minutes: number;
  fromDate: string;
  toDate: string;
}

export interface NotificationSettings {
  blockStart: boolean;
  zeroRule: boolean;
  morning: boolean;
}

export interface AppSettings {
  wakeTime: string;
  workStart: string;
  workEnd: string;
  commuteMinutes: number;
  gymDays: number[];
  gymStart: string;
  sleepTime: string;
  defaultMode: Mode;
  theme: ThemeChoice;
  notifications: NotificationSettings;
  weeklyLangTargetMinutes: number;
  weeklyLinkedinPosts: number;
  weeklyLinkedinComments: number;
  gymPerWeek: number;
}

export interface DaySchedule {
  date: string;
  mode: Mode;
  isWorkday: boolean;
  blocks: Task[];
  recoverable: Task[];
  bigTaskId: string | null;
}

export interface AppData {
  seededAt: string;
  baselineLangHours: number;
  settings: AppSettings;
  days: Record<string, DayPlan>;
  reviews: WeekReview[];
  ideas: LinkedInIdea[];
  recoveries: Recovery[];
}

export type PaletteId =
  | "garden"
  | "paper"
  | "night"
  | "ocean"
  | "clay"
  | "sky"
  | "dracula";
export type AccentId = "green" | "blue" | "olive" | "tea" | "amber" | "violet";
/** `palette` lets the active palette pick the accent. */
export type AccentChoice = AccentId | "palette";
export type TemplateId =
  | "programmer"
  | "athlete"
  | "tailor"
  | "student"
  | "simple"
  | "custom";
export type CategoryTone =
  | "green"
  | "blue"
  | "olive"
  | "tea"
  | "clay"
  | "gold"
  | "stone";
export type ModuleId =
  | "cefr"
  | "linkedin"
  | "gym"
  | "journal"
  | "focus"
  | "garden"
  | "review"
  | "notifications";
export type GardenRule = "one" | "half" | "core";
export type BloomStyle = "auto" | "cream" | "gold" | "leaf";
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Modules = Record<ModuleId, boolean>;

export interface Profile {
  name: string;
  avatarEmoji?: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  short: string;
  icon: IconName;
  tone: CategoryTone;
  builtin: boolean;
  module?: "cefr" | "linkedin" | "gym";
  growth?: boolean;
  rest?: boolean;
}

export interface TemplateBlock {
  id: string;
  title: string;
  categoryId: string;
  start: string;
  end: string;
  priority: Priority;
  fixed: boolean;
  movable: boolean;
  compensable: boolean;
  core: boolean;
  note?: string;
  muscle?: string;
  review?: boolean;
}

export type WeekTemplate = Record<WeekdayIndex, { blocks: TemplateBlock[] }>;

export interface AppSettingsV2 extends AppSettings {
  commuteOutMinutes: number;
  commuteBackMinutes: number;
  palette: PaletteId;
  accent: AccentChoice;
  lateEnabled: boolean;
  lateShiftMinutes: number;
  templateId: TemplateId;
  modules: Modules;
  gardenRule: GardenRule;
  bloomStyle: BloomStyle;
  workdays: number[];
}

export interface AppDataV2 {
  schemaVersion: 4;
  updatedAt: string;
  profile: Profile;
  settings: AppSettingsV2;
  categories: CategoryDef[];
  weekTemplate: WeekTemplate;
  days: Record<string, DayPlan>;
  reviews: WeekReview[];
  ideas: LinkedInIdea[];
  recoveries: Recovery[];
  seededAt: string;
  baselineLangHours: number;
}
