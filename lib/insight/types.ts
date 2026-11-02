/** manar-api GET /mcp-servers, GET /sessions, GET /sessions/:id and the public shared session. */
export const MCP_FLAGS = [
  "unknown_publisher",
  "unpinned_version",
  "remote_no_tls",
  "runs_shell",
  "writes_outside_home",
] as const;
export type McpFlag = (typeof MCP_FLAGS)[number];

export interface McpServerRow {
  id: string;
  hostId: string;
  hostname: string;
  toolId: string;
  name: string;
  transport: "stdio" | "http" | "sse";
  command: string | null;
  argCount: number;
  url: string | null;
  package: string | null;
  version: string | null;
  envKeys: string[];
  lastSeenAt: string;
  stale: boolean;
  flags: string[];
}

/** A flag from a newer API that this console does not know is dropped, never shown raw. */
export function knownFlags(flags: string[]): McpFlag[] {
  return flags.filter((f): f is McpFlag => (MCP_FLAGS as readonly string[]).includes(f));
}

export type StepKind = "command" | "file" | "site" | "tool" | "approval" | "secret";
export const STEP_KINDS: readonly StepKind[] = [
  "command",
  "file",
  "site",
  "tool",
  "approval",
  "secret",
];
export type Decision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED";

export interface SessionStep {
  at: string;
  kind: StepKind;
  action: string;
  label: string;
  decision?: Decision;
  outcome?: "approved" | "denied" | "expired";
  blocked?: boolean;
}

export interface SessionCounts {
  commands: number;
  files: number;
  sites: number;
  tools: number;
  approvals: number;
  secrets: number;
  blocked: number;
}

export interface SessionSummary {
  id: string;
  hostId: string;
  hostname: string | null;
  toolId: string;
  toolName: string;
  source: "hook" | "gap";
  startedAt: string;
  endedAt: string;
  counts: SessionCounts;
  stepCount: number;
}

export interface SessionDetail extends Omit<SessionSummary, "stepCount"> {
  steps: SessionStep[];
}

export interface SharedSession {
  tool: string;
  source: "hook" | "gap";
  startedAt: string;
  durationSeconds: number;
  counts: SessionCounts;
  steps: { t: number; kind: StepKind; text: string; decision?: Decision; blocked?: boolean }[];
}
