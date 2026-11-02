import type { AiSystemCoverageValue } from "@/hooks/use-ai-systems";

/**
 * The AI tools a device reports (manar-api GET /ai-tools). The enforcement label comes from the
 * API, which caps it by what each tool can do; the console never upgrades it.
 */
export type ProtectMode = "hook" | "mcp" | "gateway" | "none";
export type Enforcement = "governed" | "observed-only" | "monitoring unavailable";

export interface AiToolRow {
  toolId: string;
  name: string;
  version: string | null;
  path: string | null;
  protected: boolean;
  protectMode: ProtectMode;
  desiredProtection: boolean;
  changes: string[];
  supportedModes: Exclude<ProtectMode, "none">[];
  enforcement: Enforcement;
}

export interface AiToolsDevice {
  hostId: string;
  hostname: string;
  os: string;
  status: "PENDING" | "APPROVED";
  online: boolean;
  lastSeenAt: string | null;
  tools: AiToolRow[];
}

const COVERAGE: Record<Enforcement, AiSystemCoverageValue> = {
  governed: "GOVERNED",
  "observed-only": "OBSERVED_ONLY",
  "monitoring unavailable": "MONITORING_UNAVAILABLE",
};

/** Unknown label text from a newer API is shown as observed-only, the lowest claim. */
export function coverageOf(label: string): AiSystemCoverageValue {
  return COVERAGE[label as Enforcement] ?? "OBSERVED_ONLY";
}

/** The protection mode as shown: nothing installed reads "observed only", never a blank. */
export function modeKey(
  tool: Pick<AiToolRow, "protected" | "protectMode">,
): "hook" | "mcp" | "gateway" | "observed" {
  return tool.protected && tool.protectMode !== "none" ? tool.protectMode : "observed";
}

export function toolsByHostId(devices: AiToolsDevice[]): Map<string, AiToolRow[]> {
  return new Map(devices.map((d) => [d.hostId, d.tools]));
}

/** One thing to fix, from manar-api GET /ai-tools/protection (the checks of `manar-edge status`). */
export type ProtectionProblemCode =
  | "no_device"
  | "device_pending"
  | "device_never_synced"
  | "device_offline"
  | "tool_off"
  | "tool_not_applied"
  | "tool_seen_only"
  | "module_down"
  | "module_missing";

export interface ProtectionProblem {
  code: ProtectionProblemCode;
  hostId?: string;
  hostname?: string;
  toolId?: string;
  toolName?: string;
  module?: string;
  lastSeenAt?: string | null;
}

export interface ProtectionStatus {
  ok: boolean;
  checkedAt: string;
  devices: { hostId: string; hostname: string; os: string; status: string; online: boolean }[];
  problems: ProtectionProblem[];
}

/** The command that restarts Manar on a device, by its OS. */
export function restartCommand(os: string | undefined): string {
  return /windows/i.test(os ?? "")
    ? "Restart-Service ManarEdge"
    : "sudo systemctl restart manar-edge";
}
