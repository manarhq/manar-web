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
 * The device this page is waiting for: the host enrolled with THIS page's install key, PENDING
 * (waiting for a person) or APPROVED (a personal workspace approves its own code's device at
 * once). Matching by key and not by time means a second machine that registers meanwhile
 * (someone else's, or another of your own) is never shown here.
 */
export function deviceForCode(hosts: Host[], installKeyId: string | undefined): Host | undefined {
  if (!installKeyId) return undefined;
  return hosts.find(
    (h) => (h.status === "PENDING" || h.status === "APPROVED") && h.installKeyId === installKeyId,
  );
}
