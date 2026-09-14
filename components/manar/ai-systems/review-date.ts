/**
 * `nextReviewDate` is a `date-time` on the wire, but only a calendar date
 * is meaningful to whoever schedules a review — so the console edits it
 * with a plain `<input type="date">` and widens it to midnight UTC on the
 * way out. Kept in one place so create and edit round-trip the value
 * identically.
 *
 * The empty string is *not* a date: it means the field was left blank,
 * which the API represents as absent — UNSCHEDULED. Absent is never
 * rendered as "not due" anywhere in this console, and is never quietly
 * substituted with a far-future date to make a column line up.
 */
export function reviewDateToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** ISO instant -> the `yyyy-mm-dd` an `<input type="date">` expects. */
export function isoToReviewDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
