/**
 * Audit event types are dot/underscore-notation strings straight from
 * manar-api's event catalog (`policy.published`, `tenant.settings_updated`,
 * `tool.invocation.completed`) — real, precise, and exactly what a
 * developer or the raw audit record needs, but not what a SOC operator
 * should have to parse at a glance in a table cell (design-rework.md's
 * Data humanization section).
 *
 * Derived programmatically rather than a hardcoded per-event-type lookup
 * table: manar-api's event names are already consistently
 * `resource.verb`/`resource.sub_verb` word-separated (`.` between
 * segments, `_` within one), so splitting on both separators and
 * re-joining as a sentence covers every event type this or a future
 * phase adds without a maintained map. `policy.published` -> "Policy
 * published", `tenant.settings_updated` -> "Tenant settings updated".
 *
 * Callers should keep the raw `eventType` available too (e.g. a `title`
 * attribute) — this humanizes the *display*, it doesn't replace the
 * underlying data.
 */
export function humanizeEventType(eventType: string): string {
  const words = eventType
    .split(".")
    .flatMap((segment) => segment.split("_"))
    .filter(Boolean);

  if (words.length === 0) return eventType;

  const phrase = words.join(" ").toLowerCase();
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
