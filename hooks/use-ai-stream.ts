"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { openStream, StreamHttpError } from "@/lib/ai-stream/sse";

export type AiStreamStatus = "idle" | "streaming" | "done" | "stopped" | "error";

export interface AiStream<TResult, TBody> {
  status: AiStreamStatus;
  /** The answer text so far. After `done`, the caller shows the final result instead (cleaned, checked). */
  text: string;
  result: TResult | null;
  /** The HTTP status when the request was refused before the stream started (402, 403, 404, 429...). */
  httpStatus: number | null;
  /** manar-api's error body for that refusal, for `apiErrorMessage`. */
  error: unknown;
  start: (body: TBody) => void;
  /** Stops the model call (closing the connection stops it on the server) and keeps the text so far. */
  stop: () => void;
  reset: () => void;
}

/**
 * Runs one streamed AI action (`POST <url>`, Server-Sent Events from manar-api through the BFF):
 * `delta` events append to `text`, `done` carries the same body the plain endpoint returns, `error`
 * ends it. Starting again stops the previous run; leaving the page stops it too.
 */
export function useAiStream<TResult extends { available: boolean }, TBody>(
  url: string,
): AiStream<TResult, TBody> {
  const [status, setStatus] = useState<AiStreamStatus>("idle");
  const [text, setText] = useState("");
  const [result, setResult] = useState<TResult | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const controller = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    controller.current?.abort();
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(
    (body: TBody) => {
      controller.current?.abort();
      const ctl = new AbortController();
      controller.current = ctl;
      setStatus("streaming");
      setText("");
      setResult(null);
      setHttpStatus(null);
      setError(null);
      let finished = false;
      void openStream(url, {
        body,
        signal: ctl.signal,
        onEvent: ({ event, data }) => {
          if (ctl.signal.aborted) return;
          if (event === "delta") {
            setText((current) => current + (data as { t: string }).t);
          } else if (event === "done") {
            finished = true;
            setResult(data as TResult);
            setStatus("done");
          } else if (event === "error") {
            finished = true;
            setStatus("error");
          }
        },
      })
        .then(() => {
          // The connection ended without a result: treat it as a failure, not as success.
          if (!finished && !ctl.signal.aborted) setStatus("error");
        })
        .catch((failure: unknown) => {
          if (ctl.signal.aborted) {
            if (controller.current === ctl) setStatus("stopped");
            return;
          }
          if (failure instanceof StreamHttpError) {
            setHttpStatus(failure.status);
            setError(failure.body);
          }
          setStatus("error");
        });
    },
    [url],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setStatus("idle");
    setText("");
    setResult(null);
    setHttpStatus(null);
    setError(null);
  }, []);

  return { status, text, result, httpStatus, error, start, stop, reset };
}
