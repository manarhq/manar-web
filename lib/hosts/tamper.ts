/** A device's latest tamper report of the last 7 days (manar-api src/hosts/tamper.ts). */
export interface DeviceTamper {
  at: string;
  kind: string;
  toolId: string | null;
  maskedPath: string | null;
}

const KINDS = [
  "settings_write",
  "hook_removed",
  "hooks_disabled",
  "settings_flag",
  "config_dir",
] as const;
export type TamperKey = (typeof KINDS)[number] | "unknown";

/** The message key for a kind; a kind from a newer API reads as the generic text. */
export function tamperKey(kind: string): TamperKey {
  const k = kind.replace(/^protect\.tamper\./, "");
  return (KINDS as readonly string[]).includes(k) ? (k as TamperKey) : "unknown";
}
