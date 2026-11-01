import type { WeeklyReport } from "@/components/manar/personal/weekly-report-card";

/** `GET /workspace/report-card` and `GET /public/report/:shareId` (totals only). */
export interface ReportCardApi {
  from: string;
  to: string;
  actions: number;
  askedYou: number;
  blocked: number;
  secretsKeptSafe: number;
  series: number[];
}

export function toWeeklyReport(api: ReportCardApi): WeeklyReport {
  return {
    from: api.from,
    to: api.to,
    actions: api.actions,
    asked: api.askedYou,
    blocked: api.blocked,
    secretsKeptSafe: api.secretsKeptSafe,
    daily: api.series,
  };
}

/** Same values as the --report-* tokens in app/globals.css (a test keeps them in step). The OG
 * image renderer cannot read CSS variables. */
export const REPORT_COLORS = {
  "--report-bg": "#02070a",
  "--report-line": "#1a2a35",
  "--report-text": "#e8f1f6",
  "--report-muted": "#8fa3b0",
  "--report-blue": "#38b6f5",
  "--report-orange": "#fc734d",
  "--report-red": "#ff5470",
} as const;
