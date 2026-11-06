import { z } from "zod";

import { openStream, StreamHttpError } from "@/lib/ai-stream/sse";

/**
 * Client side of the console assistant (manar-api `POST /assistant/chat`,
 * ADR-0008). The request goes through the BFF (`/api/bff/...`), which adds
 * the signed-in user's token; the browser never holds it.
 *
 * Opening the panel from elsewhere (the tutorial, a page): call
 * `openAssistant(prompt?)`, `window.openAssistant(prompt?)`, or dispatch
 * `new CustomEvent("manar:assistant:open", { detail: { prompt } })`.
 * A prompt is only placed in the input box; the user sends it.
 */

export const ASSISTANT_OPEN_EVENT = "manar:assistant:open";

export interface AssistantOpenDetail {
  prompt?: string;
}

export function openAssistant(prompt?: string): void {
  window.dispatchEvent(
    new CustomEvent<AssistantOpenDetail>(ASSISTANT_OPEN_EVENT, {
      detail: prompt ? { prompt } : {},
    }),
  );
}

declare global {
  interface Window {
    openAssistant?: (prompt?: string) => void;
  }
}

/** Console sections a source or suggestion may link to. Anything else is dropped. */
const CONSOLE_PATH =
  /^\/(overview|agents|tasks|approvals|policies|audit|incidents|tools|users|ai-systems)(\/[0-9a-fA-F-]{36})?$/;

const href = z.string().regex(CONSOLE_PATH);

const sourceSchema = z.object({
  ref: z.number().int().positive(),
  kind: z.enum([
    "decision",
    "audit_event",
    "approval",
    "agent",
    "policy",
    "incident",
    "help",
    "page",
  ]),
  id: z.string(),
  label: z.string().max(200),
  href,
});

const suggestionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open"), label: z.string().max(80), href }),
  z.object({
    type: z.literal("highlight"),
    label: z.string().max(80),
    href,
    target: z.enum(["approve-button", "deny-button"]),
  }),
  z.object({
    type: z.literal("draft"),
    label: z.string().max(80),
    href,
    draft: z.string().max(4000),
  }),
]);

/** Drops any element that fails its schema instead of failing the whole answer. */
const lenient = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((i) => {
        const parsed = item.safeParse(i);
        return parsed.success ? [parsed.data as z.infer<T>] : [];
      }),
    );

const responseSchema = z.union([
  z.object({
    available: z.literal(true),
    answer: z.string(),
    sources: lenient(sourceSchema),
    suggestions: lenient(suggestionSchema),
  }),
  z.object({ available: z.literal(false), reason: z.string().optional() }),
]);

export type AssistantSource = z.infer<typeof sourceSchema>;
export type AssistantSuggestion = z.infer<typeof suggestionSchema>;
export type AssistantReply = z.infer<typeof responseSchema>;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  suggestions?: AssistantSuggestion[];
  /** The person pressed stop: this is the part that had been written. */
  stopped?: boolean;
}

export class AssistantHttpError extends Error {
  constructor(readonly status: number) {
    super(`assistant request failed: ${status}`);
  }
}

/** Sends the conversation (the last turn is the new question) and validates the reply. */
export async function askAssistant(input: {
  turns: ChatTurn[];
  locale: "en" | "ar";
  page?: string;
  signal?: AbortSignal;
}): Promise<AssistantReply> {
  const response = await fetch("/api/bff/assistant/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: input.signal,
    body: JSON.stringify({
      // The API keeps at most 20 turns; send the most recent ones.
      messages: input.turns.slice(-20).map(({ role, content }) => ({
        role,
        content: content.slice(0, 4000),
      })),
      locale: input.locale,
      ...(input.page && /^(\/[a-z0-9-]+)+$/i.test(input.page) ? { page: input.page } : {}),
    }),
  });
  if (!response.ok) throw new AssistantHttpError(response.status);
  return responseSchema.parse(await response.json());
}

/**
 * Same question as `askAssistant`, answered as a stream (`POST /assistant/chat/stream`): `onToken`
 * gets the answer text as the model writes it, `onTools` fires when the model turns to reading
 * records (the text so far was thinking aloud: drop it). Resolves with the final, cleaned reply,
 * which replaces what was streamed. Aborting `signal` stops the model call.
 */
export async function askAssistantStream(input: {
  turns: ChatTurn[];
  locale: "en" | "ar";
  page?: string;
  signal?: AbortSignal;
  onToken: (text: string) => void;
  onTools: () => void;
}): Promise<AssistantReply> {
  let reply: AssistantReply | undefined;
  let failure: number | undefined;
  try {
    await openStream("/api/bff/assistant/chat/stream", {
      signal: input.signal,
      body: {
        messages: input.turns.slice(-20).map(({ role, content }) => ({
          role,
          content: content.slice(0, 4000),
        })),
        locale: input.locale,
        ...(input.page && /^(\/[a-z0-9-]+)+$/i.test(input.page) ? { page: input.page } : {}),
      },
      onEvent: ({ event, data }) => {
        if (event === "token") input.onToken((data as { t: string }).t);
        else if (event === "tool") input.onTools();
        else if (event === "done") reply = responseSchema.parse(data);
        else if (event === "error") {
          const code = (data as { code?: unknown }).code;
          failure = typeof code === "number" ? code : 500;
        }
      },
    });
  } catch (error) {
    if (error instanceof StreamHttpError) throw new AssistantHttpError(error.status);
    throw error;
  }
  if (failure !== undefined) throw new AssistantHttpError(failure);
  if (!reply) throw new AssistantHttpError(502);
  return reply;
}
