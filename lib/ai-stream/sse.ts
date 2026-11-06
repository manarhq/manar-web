/**
 * Server-Sent Events over `fetch`. `EventSource` cannot send a POST body or the BFF's cookie
 * rules the console needs, so the AI streams are read from a normal `fetch` response body.
 */
export interface SseEvent {
  event: string;
  data: unknown;
}

/** A non-2xx answer, before any stream started (400 validation, 402 paused, 403, 404, 429). */
export class StreamHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`stream request failed: ${status}`);
  }
}

/** Splits an SSE byte stream into events. Comments (heartbeats) are dropped. */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  const flush = (frame: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (data.length === 0) return;
    try {
      onEvent({ event, data: JSON.parse(data.join("\n")) });
    } catch {
      // A frame that is not JSON is not ours: ignore it rather than end the stream.
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let at: number;
    while ((at = pending.indexOf("\n\n")) !== -1) {
      flush(pending.slice(0, at));
      pending = pending.slice(at + 2);
    }
  }
}

/**
 * POSTs (or GETs, with no body) to `url` and feeds the event stream to `onEvent`. Resolves when the
 * stream ends. Rejects with `StreamHttpError` for a non-2xx answer, and with the fetch error (an
 * `AbortError` when `signal` aborts) otherwise.
 */
export async function openStream(
  url: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
    onEvent: (event: SseEvent) => void;
  },
): Promise<void> {
  const response = await fetch(url, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers: {
      accept: "text/event-stream",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    throw new StreamHttpError(response.status, await response.json().catch(() => null));
  }
  await readSse(response.body, options.onEvent);
}
