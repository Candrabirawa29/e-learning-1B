export const APP_TIMEZONE = "Asia/Jakarta";

const MONTHS_INDO = [
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

const DAYS_INDO = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export function formatDateIndo(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const d = date.getDate();
  const m = MONTHS_INDO[date.getMonth()];
  const y = date.getFullYear();

  return `${d} ${m} ${y}`;
}

export function formatDateTimeIndo(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const dayName = DAYS_INDO[date.getDay()];
  const d = date.getDate();
  const m = MONTHS_INDO[date.getMonth()];
  const y = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${dayName}, ${d} ${m} ${y} • ${hours}:${minutes} WIB`;
}

export function formatRelativeDeadline(deadlineInput: Date | string | null | undefined): {
  text: string;
  isOverdue: boolean;
  isUrgent: boolean;
} {
  if (!deadlineInput) {
    return { text: "Tidak ada deadline", isOverdue: false, isUrgent: false };
  }

  const deadline = new Date(deadlineInput);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: overdueDays === 0 ? "Lewat hari ini" : `Terlambat ${overdueDays} hari`,
      isOverdue: true,
      isUrgent: true,
    };
  }

  if (diffHours <= 24) {
    return {
      text: diffHours <= 1 ? "Kurang dari 1 jam lagi" : `${diffHours} jam lagi`,
      isOverdue: false,
      isUrgent: true,
    };
  }

  if (diffDays === 1) {
    return { text: "Besok", isOverdue: false, isUrgent: true };
  }

  if (diffDays <= 3) {
    return { text: `${diffDays} hari lagi`, isOverdue: false, isUrgent: true };
  }

  return { text: `${diffDays} hari lagi`, isOverdue: false, isUrgent: false };
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

