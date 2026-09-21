/** Date helpers shared by the loan and application screens. */

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Shifts an ISO date by whole months, keeping the day where possible. */
export function addMonths(dateText: string, count: number): Date {
  const date = new Date(`${dateText}T00:00:00`);
  const targetDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + count);
  // Clamp for months that are shorter than the original day.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(targetDay, lastDay));
  return date;
}

export function formatDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

/** Whole days from today until an ISO date. Negative means the date has passed. */
export function daysUntil(dateText: string): number {
  const target = new Date(`${dateText}T00:00:00`).getTime();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return Math.round((target - startOfToday.getTime()) / 86_400_000);
}
