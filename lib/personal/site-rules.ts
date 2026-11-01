/**
 * JAIL site rules (manar-api GET/POST/DELETE /jail/site-rules): what a person allowed or blocked
 * for one AI tool on one device. Only these tools are filtered, and only on Linux for now.
 */
export const JAIL_TOOLS = [
  { id: "host.claude-code", name: "Claude Code" },
  { id: "host.codex-cli", name: "Codex CLI" },
  { id: "host.gemini-cli", name: "Gemini CLI" },
  { id: "host.copilot-cli", name: "Copilot CLI" },
] as const;

export interface SiteRule {
  id: string;
  hostId: string;
  hostname: string;
  toolId: string;
  site: string;
  mode: "ALLOW" | "DENY";
  /** null means always. */
  expiresAt: string | null;
  source: "approval" | "console";
  createdBy: string;
  createdAt: string;
}

export function toolName(toolId: string): string {
  return JAIL_TOOLS.find((t) => t.id === toolId)?.name ?? toolId.replace(/^host\./, "");
}

/** The tools of a device that JAIL can filter, from the AI tools list. */
export function jailToolsOf(tools: { toolId: string }[]): { id: string; name: string }[] {
  return JAIL_TOOLS.filter((j) => tools.some((t) => t.toolId === j.id)).map((j) => ({ ...j }));
}
