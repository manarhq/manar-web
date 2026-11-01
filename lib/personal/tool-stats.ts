/**
 * Per-tool allowed / waiting / blocked counts for the personal Home, from audit events and the
 * current pending approvals. Pure so it is easy to test.
 *
 * - allowed: audit events with decision ALLOW (or APPROVE, a person said yes).
 * - blocked: audit events with decision DENY.
 * - waiting: approvals that are PENDING right now, not historical APPROVAL_REQUIRED events, so
 *   the chip never claims something still waits after it was answered.
 * Events carry no host id yet, so everything lands under HOST_UNKNOWN unless `data.hostId` is a
 * string (the coverage track adds it with the inventory).
 */
export const HOST_UNKNOWN = "*";

export interface ToolCounts {
  toolId: string;
  allowed: number;
  waiting: number;
  blocked: number;
}

interface EventLike {
  toolId?: string;
  decision?: string;
  data?: unknown;
}
interface PendingLike {
  toolId: string;
}

function hostOf(event: EventLike): string {
  const data = event.data as { hostId?: unknown } | undefined;
  return typeof data?.hostId === "string" ? data.hostId : HOST_UNKNOWN;
}

export function summarizeTools(
  events: EventLike[],
  pending: PendingLike[],
): Map<string, ToolCounts[]> {
  const byHost = new Map<string, Map<string, ToolCounts>>();
  const row = (host: string, toolId: string): ToolCounts => {
    let tools = byHost.get(host);
    if (!tools) byHost.set(host, (tools = new Map()));
    let counts = tools.get(toolId);
    if (!counts) tools.set(toolId, (counts = { toolId, allowed: 0, waiting: 0, blocked: 0 }));
    return counts;
  };

  for (const event of events) {
    if (!event.toolId) continue;
    if (event.decision === "ALLOW" || event.decision === "APPROVE") {
      row(hostOf(event), event.toolId).allowed++;
    } else if (event.decision === "DENY") {
      row(hostOf(event), event.toolId).blocked++;
    }
  }
  for (const approval of pending) row(HOST_UNKNOWN, approval.toolId).waiting++;

  return new Map(
    [...byHost].map(([host, tools]) => [
      host,
      [...tools.values()].sort((a, b) => a.toolId.localeCompare(b.toolId)),
    ]),
  );
}

/** Display names for the tool ids in the coverage catalogue; unknown ids show as-is. */
const TOOL_NAMES: Record<string, string> = {
  "host.claude-code": "Claude Code",
  "host.claude-desktop": "Claude Desktop",
  "host.cursor": "Cursor",
  "host.windsurf": "Windsurf",
  "host.vscode-copilot": "GitHub Copilot",
  "host.copilot-cli": "Copilot CLI",
  "host.codex-cli": "Codex CLI",
  "host.chatgpt-desktop": "ChatGPT",
  "host.gemini-cli": "Gemini CLI",
};

export function toolDisplayName(toolId: string): string {
  return TOOL_NAMES[toolId] ?? toolId;
}
