import type { SecretEvent, VaultAccess } from "@/hooks/use-secrets";
import type { SecretItem } from "@/components/manar/personal/secrets-card";
import { toolDisplayName } from "@/lib/personal/tool-stats";

/**
 * Maps the secrets feed onto the Home card rows. A touch Manar stopped is "blocked", a touch it
 * only saw is "allowed" (the label means "went through", not "was fine"), and a program waiting
 * for a vaulted secret is "waiting". Only `secret.touched` events become rows.
 */
export function toSecretItems(events: SecretEvent[], access: VaultAccess[] = []): SecretItem[] {
  const waiting: SecretItem[] = access.map((a) => ({
    id: `access-${a.id}`,
    state: "waiting",
    tool: a.program,
    maskedPath: `${a.kind}: ${a.ref}`,
    at: a.createdAt,
  }));
  const touched: SecretItem[] = events
    .filter((e) => e.type === "secret.touched")
    .map((e) => ({
      id: e.id,
      state: e.blocked ? "blocked" : "allowed",
      tool: e.toolId ? toolDisplayName(e.toolId) : (e.process ?? ""),
      maskedPath: e.maskedPath ?? "",
      at: e.at,
    }));
  return [...waiting, ...touched];
}
