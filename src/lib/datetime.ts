/**
 * Timezone & Datetime Utilities for Asia/Jakarta (WIB, UTC+07:00, no DST).
 * Built with native Intl.DateTimeFormat (zero extra dependencies).
 */

export const APP_TIMEZONE = "Asia/Jakarta";
export const WIB_TIMEZONE = APP_TIMEZONE;
export const WIB_OFFSET_HOURS = 7;
export const WIB_OFFSET_MINUTES = 420;

export type WibFormatPreset =
  | "date"
  | "date-short"
  | "datetime"
  | "datetime-full"
  | "datetime-short"
  | "time"
  | "time-only"
  | "day-date"
  | "day-name"
  | "iso-date"
  | "iso-datetime";

/**
 * Parses input string/number/Date as an explicit Asia/Jakarta (WIB) local time.
 * If input is a local string like "2026-10-16T14:30" or "2026-10-16", it treats it
 * as Asia/Jakarta (+07:00) rather than server/system local time.
 */
export function parseWibLocal(input: string | Date | number | null | undefined): Date | null {
  if (input === null || input === undefined) return null;

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();
  if (!str) return null;

  // 1. If it already has explicit timezone (ends with Z or +/-HH:mm or +/-HH)
  if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Format: "YYYY-MM-DD" -> treat as WIB 00:00:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Format: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm"
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(str)) {
    const iso = str.replace(" ", "T");
    const d = new Date(`${iso}:00+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // 4. Format: "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(str)) {
    const iso = str.replace(" ", "T");
    const d = new Date(`${iso}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // 5. Format: "YYYY-MM-DDTHH:mm:ss.sss"
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\.\d+$/.test(str)) {
    const iso = str.replace(" ", "T");
    const d = new Date(`${iso}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback parsing
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Extracts date-time components in Asia/Jakarta timezone.
 */
function getWibParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  return {
    year: map.year || "1970",
    month: map.month || "01",
    day: map.day || "01",
    hour: map.hour || "00",
    minute: map.minute || "00",
    second: map.second || "00",
    weekday: map.weekday || "Mon",
  };
}

/**
 * Converts a Date / date string into a local datetime-local input string: "YYYY-MM-DDTHH:mm"
 * formatted explicitly in Asia/Jakarta (WIB) timezone.
 */
export function toWibLocalInput(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "";
  const date = parseWibLocal(dateInput);
  if (!date) return "";

  const { year, month, day, hour, minute } = getWibParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Returns a day key in format "YYYY-MM-DD" evaluated explicitly in Asia/Jakarta timezone.
 * Used for day-level grouping (calendars, due soon, dashboard).
 */
export function wibDayKey(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "";
  const date = parseWibLocal(dateInput);
  if (!date) return "";

  const { year, month, day } = getWibParts(date);
  return `${year}-${month}-${day}`;
}

const MONTHS_INDO_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_INDO_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const DAYS_INDO_LONG: Record<string, string> = {
  Mon: "Senin",
  Tue: "Selasa",
  Wed: "Rabu",
  Thu: "Kamis",
  Fri: "Jumat",
  Sat: "Sabtu",
  Sun: "Minggu",
};

/**
 * Formats a date explicitly in Asia/Jakarta (WIB) timezone using Indonesian locale.
 * Supports presets ("date", "datetime", "time", etc.) or Intl.DateTimeFormatOptions.
 */
export function formatWib(
  dateInput: Date | string | number | null | undefined,
  patternOrOptions?: WibFormatPreset | Intl.DateTimeFormatOptions | string
): string {
  if (!dateInput) return "-";
  const date = parseWibLocal(dateInput);
  if (!date) return "-";

  // If Intl.DateTimeFormatOptions object was passed
  if (patternOrOptions && typeof patternOrOptions === "object") {
    try {
      const mergedOptions: Intl.DateTimeFormatOptions = {
        timeZone: APP_TIMEZONE,
        ...patternOrOptions,
      };
      return new Intl.DateTimeFormat("id-ID", mergedOptions).format(date);
    } catch {
      return "-";
    }
  }

  const { year, month, day, hour, minute, second, weekday } = getWibParts(date);
  const mIndex = parseInt(month, 10) - 1;
  const monthLong = MONTHS_INDO_LONG[mIndex] || month;
  const monthShort = MONTHS_INDO_SHORT[mIndex] || month;
  const dayNameLong = DAYS_INDO_LONG[weekday] || weekday;
  const dayNum = parseInt(day, 10);

  const preset = typeof patternOrOptions === "string" ? patternOrOptions : "datetime";

  switch (preset) {
    case "date":
      // "16 Oktober 2026"
      return `${dayNum} ${monthLong} ${year}`;

    case "date-short":
      // "16 Okt 2026"
      return `${dayNum} ${monthShort} ${year}`;

    case "datetime":
    case "datetime-full":
      // "Jumat, 16 Oktober 2026 • 14:30 WIB"
      return `${dayNameLong}, ${dayNum} ${monthLong} ${year} • ${hour}:${minute} WIB`;

    case "datetime-short":
      // "16 Okt 2026, 14:30 WIB"
      return `${dayNum} ${monthShort} ${year}, ${hour}:${minute} WIB`;

    case "time":
      // "14:30 WIB"
      return `${hour}:${minute} WIB`;

    case "time-only":
      // "14:30"
      return `${hour}:${minute}`;

    case "day-date":
      // "Jumat, 16 Oktober 2026"
      return `${dayNameLong}, ${dayNum} ${monthLong} ${year}`;

    case "day-name":
      // "Jumat"
      return dayNameLong;

    case "iso-date":
      return `${year}-${month}-${day}`;

    case "iso-datetime":
      return `${year}-${month}-${day}T${hour}:${minute}`;

    default:
      // Pattern replacement if custom string like "dd/MM/yyyy" or "yyyy-MM-dd"
      if (typeof preset === "string" && preset.includes("%") || /[ydMhHms]/.test(preset)) {
        return preset
          .replace(/yyyy/g, year)
          .replace(/yy/g, year.slice(-2))
          .replace(/MMMM/g, monthLong)
          .replace(/MMM/g, monthShort)
          .replace(/MM/g, month)
          .replace(/M/g, String(mIndex + 1))
          .replace(/dd/g, day)
          .replace(/d/g, String(dayNum))
          .replace(/HH/g, hour)
          .replace(/H/g, String(parseInt(hour, 10)))
          .replace(/mm/g, minute)
          .replace(/ss/g, second)
          .replace(/EEEE/g, dayNameLong)
          .replace(/EEE/g, dayNameLong.slice(0, 3));
      }
      return `${dayNameLong}, ${dayNum} ${monthLong} ${year} • ${hour}:${minute} WIB`;
  }
}

/**
 * Returns current day of week in WIB (1 = Senin, ..., 7 = Minggu).
 */
export function getWibDayOfWeek(dateInput?: Date | string | number | null): number {
  const date = dateInput ? parseWibLocal(dateInput) ?? new Date() : new Date();
  const { weekday } = getWibParts(date);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday] || 1;
}

/**
 * Start of day in Asia/Jakarta timezone (00:00:00.000+07:00).
 */
export function startOfWibDay(dateInput: Date | string | number | null | undefined): Date | null {
  const key = wibDayKey(dateInput);
  if (!key) return null;
  return new Date(`${key}T00:00:00+07:00`);
}

/**
 * End of day in Asia/Jakarta timezone (23:59:59.999+07:00).
 */
export function endOfWibDay(dateInput: Date | string | number | null | undefined): Date | null {
  const key = wibDayKey(dateInput);
  if (!key) return null;
  return new Date(`${key}T23:59:59.999+07:00`);
}

/**
 * Calculates calendar day difference (targetDay - baseDay) based on Asia/Jakarta calendar dates.
 */
export function diffWibCalendarDays(
  targetDate: Date | string | number | null | undefined,
  baseDate: Date | string | number | null | undefined = new Date()
): number {
  const targetKey = wibDayKey(targetDate);
  const baseKey = wibDayKey(baseDate);
  if (!targetKey || !baseKey) return 0;

  const targetUtc = Date.UTC(
    Number(targetKey.slice(0, 4)),
    Number(targetKey.slice(5, 7)) - 1,
    Number(targetKey.slice(8, 10))
  );
  const baseUtc = Date.UTC(
    Number(baseKey.slice(0, 4)),
    Number(baseKey.slice(5, 7)) - 1,
    Number(baseKey.slice(8, 10))
  );

  return Math.round((targetUtc - baseUtc) / (24 * 60 * 60 * 1000));
}
