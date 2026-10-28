const FA_LOCALE = "fa-IR-u-ca-persian";

export const WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function addDays(date: Date, n: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

export function addDaysKey(key: string, n: number): string {
  return toDateKey(addDays(parseDateKey(key), n));
}

/** Saturday = 0 ... Friday = 6 */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 1) % 7;
}

export function weekdayIndexFromKey(key: string): number {
  return weekdayIndex(parseDateKey(key));
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = parseDateKey(toDateKey(date));
  return addDays(d, -weekdayIndex(d));
}

export function startOfWeekKey(date: Date = new Date()): string {
  return toDateKey(startOfWeek(date));
}

export function weekDayKeys(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysKey(startKey, i));
}

function faParts(date: Date) {
  const parts = new Intl.DateTimeFormat(FA_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) =>
    toFa(parts.find((p) => p.type === type)?.value ?? "").replace(
      /[،,]/g,
      "",
    );
  return {
    weekday: get("weekday"),
    day: get("day"),
    month: get("month"),
    year: get("year"),
  };
}

export function formatDateLong(date: Date): string {
  const p = faParts(date);
  return `${p.weekday}، ${p.day} ${p.month} ${p.year}`;
}

export function formatDateShort(date: Date): string {
  const p = faParts(date);
  return `${p.day} ${p.month}`;
}

export function formatDateWithWeekday(date: Date): string {
  const p = faParts(date);
  return `${p.weekday}، ${p.day} ${p.month}`;
}

export function formatMonthYear(date: Date): string {
  const p = faParts(date);
  return `${p.month} ${p.year}`;
}

export function formatWeekRange(startKey: string): string {
  const start = parseDateKey(startKey);
  const end = addDays(start, 6);
  const a = faParts(start);
  const b = faParts(end);
  if (a.month === b.month) {
    return `${a.day} تا ${b.day} ${b.month}`;
  }
  return `${a.day} ${a.month} تا ${b.day} ${b.month}`;
}

export function relativeDayLabel(key: string, now: Date = new Date()): string {
  const today = todayKey(now);
  if (key === today) return "امروز";
  if (key === addDaysKey(today, -1)) return "دیروز";
  if (key === addDaysKey(today, 1)) return "فردا";
  return formatDateWithWeekday(parseDateKey(key));
}

export function timeToMinutes(value: string): number {
  const [h, m] = toEnDigits(value).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function shiftTime(value: string, delta: number): string {
  return minutesToTime(timeToMinutes(value) + delta);
}

export function minutesBetween(start: string, end: string): number {
  const diff = timeToMinutes(end) - timeToMinutes(start);
  return diff >= 0 ? diff : diff + 1440;
}

export function formatTime(value: string): string {
  return toFa(value);
}

export function formatTimeRange(start: string, end: string): string {
  return `${toFa(start)} تا ${toFa(end)}`;
}

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${toFa(m)} دقیقه`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!rest) return `${toFa(h)} ساعت`;
  return `${toFa(h)} ساعت و ${toFa(rest)} دقیقه`;
}

export function formatDurationCompact(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${toFa(m)}د`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${toFa(h)}:${toFa(String(rest).padStart(2, "0"))}` : `${toFa(h)}س`;
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return toFa(rounded.toLocaleString("en-US", { maximumFractionDigits: 1 }));
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return toFa(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
}

export function nextWeekdayKey(
  fromKey: string,
  targetIndex: number,
  includeToday = false,
): string {
  const fromIndex = weekdayIndexFromKey(fromKey);
  let delta = (targetIndex - fromIndex + 7) % 7;
  if (delta === 0 && !includeToday) delta = 7;
  return addDaysKey(fromKey, delta);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
