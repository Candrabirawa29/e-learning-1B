export const APP_TIMEZONE = "Asia/Jakarta";

import {
  parseWibLocal,
  toWibLocalInput,
  formatWib,
  wibDayKey,
  getWibDayOfWeek,
  startOfWibDay,
  endOfWibDay,
  diffWibCalendarDays,
} from "./datetime";

export {
  parseWibLocal,
  toWibLocalInput,
  formatWib,
  wibDayKey,
  getWibDayOfWeek,
  startOfWibDay,
  endOfWibDay,
  diffWibCalendarDays,
};

export function formatDateIndo(dateInput: Date | string | number | null | undefined): string {
  return formatWib(dateInput, "date");
}

export function formatDateTimeIndo(dateInput: Date | string | number | null | undefined): string {
  return formatWib(dateInput, "datetime-full");
}

export function formatRelativeDeadline(deadlineInput: Date | string | null | undefined): {
  text: string;
  isOverdue: boolean;
  isUrgent: boolean;
} {
  if (!deadlineInput) {
    return { text: "Tidak ada deadline", isOverdue: false, isUrgent: false };
  }

  const deadline = parseWibLocal(deadlineInput);
  if (!deadline) {
    return { text: "Tidak ada deadline", isOverdue: false, isUrgent: false };
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const calDiffDays = diffWibCalendarDays(deadline, now);

  if (diffMs < 0) {
    const overdueDays = Math.abs(calDiffDays);
    return {
      text: overdueDays === 0 ? "Lewat hari ini" : `Terlambat ${overdueDays} hari`,
      isOverdue: true,
      isUrgent: true,
    };
  }

  if (diffHours <= 1) {
    return {
      text: "Kurang dari 1 jam lagi",
      isOverdue: false,
      isUrgent: true,
    };
  }

  if (calDiffDays === 0) {
    return {
      text: `${diffHours} jam lagi`,
      isOverdue: false,
      isUrgent: true,
    };
  }

  if (calDiffDays === 1) {
    return { text: "Besok", isOverdue: false, isUrgent: true };
  }

  if (calDiffDays <= 3) {
    return { text: `${calDiffDays} hari lagi`, isOverdue: false, isUrgent: true };
  }

  return { text: `${calDiffDays} hari lagi`, isOverdue: false, isUrgent: false };
}

export function minutesToTimeString(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const DAYS_OF_WEEK_INDO: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export function dayOfWeekToIndo(day: number): string {
  return DAYS_OF_WEEK_INDO[day] || "Tidak diketahui";
}


