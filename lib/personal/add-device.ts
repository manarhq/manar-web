import type { Host } from "@/hooks/use-hosts";

export type DeviceOs = "windows11" | "windows10" | "linux";
export type StartMode = "watch" | "ask" | "strict";

export const START_MODES: StartMode[] = ["watch", "ask", "strict"];
export const DEFAULT_START_MODE: StartMode = "ask";

/**
 * Which one-liner to show first. The user agent says "Windows NT 10.0" on both Windows 10 and 11;
 * Chromium's userAgentData platformVersion (major 13 and up) tells them apart. When it cannot be
 * told, Windows 11 is shown and the other tabs stay one click away.
 */
export function detectOs(userAgent: string, platformVersion?: string): DeviceOs {
  if (/windows/i.test(userAgent)) {
    const major = Number.parseInt(platformVersion ?? "", 10);
    return Number.isFinite(major) && major < 13 ? "windows10" : "windows11";
  }
  return /linux|x11|cros/i.test(userAgent) && !/android/i.test(userAgent) ? "linux" : "windows11";
}

/** The one-liner for an OS: Windows 10 and 11 share the PowerShell line. */
export function oneLinerFor(os: DeviceOs, c: { windows: string; linux: string }): string {
  return os === "linux" ? c.linux : c.windows;
}

/**
 * The device this page is waiting for: the newest PENDING host registered since the code was
 * made (a small slack for clock differences between the browser and the server).
 */
export function newPendingHost(hosts: Host[], codeCreatedAt: number): Host | undefined {
  const SLACK_MS = 60_000;
  return hosts
    .filter((h) => h.status === "PENDING" && Date.parse(h.createdAt) >= codeCreatedAt - SLACK_MS)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}
