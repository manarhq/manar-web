import { ImageResponse } from "next/og";

import { fetchPublicReport } from "@/lib/personal/public-report";
import { REPORT_COLORS as C } from "@/lib/personal/report";

export const alt = "This week with an AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The renderer has no Arabic shaping, so the image uses English labels and digits only.
const LABELS = ["actions", "asked you", "blocked", "secrets kept safe"] as const;

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const d = await fetchPublicReport(shareId);
  const nums = d ? [d.actions, d.askedYou, d.blocked, d.secretsKeptSafe] : [0, 0, 0, 0];
  const tones = [C["--report-blue"], C["--report-orange"], C["--report-red"], C["--report-blue"]];
  const peak = Math.max(1, ...(d?.series ?? [0]));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: C["--report-bg"],
        color: C["--report-text"],
        border: `2px solid ${C["--report-line"]}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 44, fontWeight: 600 }}>This week with an AI</div>
      <div style={{ display: "flex", gap: 56 }}>
        {nums.map((n, i) => (
          <div key={LABELS[i]} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 96, fontWeight: 700, color: tones[i] }}>
              {n.toLocaleString("en-US")}
            </div>
            <div style={{ fontSize: 28, color: C["--report-muted"] }}>{LABELS[i]}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 90 }}>
        {(d?.series ?? []).map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(6, Math.round((v / peak) * 100))}%`,
              background: C["--report-blue"],
              borderRadius: 4,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 26, color: C["--report-muted"] }}>
        Only totals are shared. Never file names or prompts. Manar
      </div>
    </div>,
    size,
  );
}
