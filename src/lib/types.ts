export type Category =
  | "work"
  | "commute"
  | "language"
  | "programming"
  | "gym"
  | "linkedin"
  | "rest";

export type Mode = "early" | "late";
export type ThemeChoice = "light" | "dark" | "system";
export type Priority = 1 | 2 | 3;

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
}

export interface DayPlan {
  date: string;
  mode: Mode;
  overrides: Record<string, BlockOverride>;
  journal?: string;
  langMinutes: number;
  deepMinutes: number;
  focusBlocks: number;
  focusMinutes: number;
  linkedinPosts: number;
  linkedinComments: number;
  note?: string;
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
