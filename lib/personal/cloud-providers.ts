export type CloudProvider = "chatgpt" | "claude" | "copilot";

/**
 * The cloud AI services a person can connect. ChatGPT registers its own OAuth client; Claude and
 * Copilot Studio use a client Manar creates (platform COPILOT_STUDIO in manar-api: "a client with
 * an id and a secret"). Claude's callback URLs are known up front; Copilot Studio shows its own
 * after the connector exists.
 */
export const CLOUD_PROVIDERS: Record<
  CloudProvider,
  { platform: "CHATGPT" | "COPILOT_STUDIO"; redirectUris: string[] }
> = {
  chatgpt: { platform: "CHATGPT", redirectUris: [] },
  claude: {
    platform: "COPILOT_STUDIO",
    redirectUris: [
      "https://claude.ai/api/mcp/auth_callback",
      "https://claude.com/api/mcp/auth_callback",
    ],
  },
  copilot: { platform: "COPILOT_STUDIO", redirectUris: [] },
};

/** `My Claude` becomes `my-claude-4k2`: lower case words, plus a short suffix so two agents never clash. */
export function agentSlug(displayName: string, random: () => number = Math.random): string {
  const base = displayName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  const suffix = Math.floor(random() * 36 ** 3)
    .toString(36)
    .padStart(3, "0");
  return base ? `${base}-${suffix}` : `agent-${suffix}`;
}

/** The standing task every cloud agent needs: open for 90 days, nothing allowed until a rule says so. */
export function standingTask(displayName: string, now: number = Date.now()) {
  return {
    name: `${displayName} (cloud)`.slice(0, 200),
    expiresAt: new Date(now + 90 * 24 * 3600 * 1000).toISOString(),
  };
}
