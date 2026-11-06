/** manar-api answers `reason: "ai_switched_off"` when the workspace has "Allow external AI" off; nothing was sent to a model. */
export const isAiSwitchedOff = (data: unknown): boolean =>
  (data as { reason?: unknown } | null | undefined)?.reason === "ai_switched_off";
