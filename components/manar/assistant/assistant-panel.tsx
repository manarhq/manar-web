"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowCounterClockwiseIcon,
  CopyIcon,
  CursorClickIcon,
  LinkSimpleIcon,
  PaperPlaneRightIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AssistantHttpError,
  askAssistant,
  type AssistantSuggestion,
  type ChatTurn,
} from "./assistant-api";

type Status = "idle" | "loading" | "unavailable" | "rateLimited" | "sessionExpired" | "error";

/** Sources whose label is an id or code, shown in mono; names stay in the reading font. */
const ID_LIKE = new Set(["decision", "audit_event", "approval", "page"]);

const STARTERS = ["denied", "approvals", "agent", "howAgent"] as const;

/** The conversation lives in this tab's sessionStorage only, keyed per tenant and user. */
function storageKey(scope: string) {
  return `manar:assistant:${scope}`;
}
function loadTurns(scope: string): ChatTurn[] {
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ChatTurn[]).slice(-40) : [];
  } catch {
    return [];
  }
}
function saveTurns(scope: string, turns: ChatTurn[]) {
  try {
    sessionStorage.setItem(storageKey(scope), JSON.stringify(turns.slice(-40)));
  } catch {
    // Storage full or blocked: the conversation still works for this view.
  }
}

/** Brings the operator's eye to a button on the page they were sent to. Never clicks it. */
function highlightWhenReady(testId: string) {
  const started = Date.now();
  const timer = window.setInterval(() => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (!el && Date.now() - started < 8000) return;
    window.clearInterval(timer);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
    el.style.outline = "2px solid var(--focus)";
    el.style.outlineOffset = "2px";
    window.setTimeout(() => {
      el.style.outline = "";
      el.style.outlineOffset = "";
    }, 6000);
  }, 200);
}

export function AssistantPanel({
  scope,
  prefill,
  onNavigate,
}: {
  scope: string;
  prefill: { text: string; nonce: number } | null;
  onNavigate: () => void;
}) {
  const t = useTranslations("assistant");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const pathname = usePathname();
  const router = useRouter();
  const [turns, setTurns] = useState<ChatTurn[]>(() => loadTurns(scope));
  const [input, setInput] = useState(prefill?.text ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [copied, setCopied] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    saveTurns(scope, turns);
    // While waiting, show the progress line; once answered, show the answer from its first line.
    const target = status === "loading" ? endRef.current : lastTurnRef.current;
    target?.scrollIntoView?.({ block: status === "loading" ? "end" : "start" });
  }, [scope, turns, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || status === "loading") return;
    const next: ChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    setStatus("loading");
    abortRef.current = new AbortController();
    try {
      const reply = await askAssistant({
        turns: next,
        locale,
        page: pathname,
        signal: abortRef.current.signal,
      });
      if (!reply.available) {
        setStatus("unavailable");
        return;
      }
      setTurns([
        ...next,
        {
          role: "assistant",
          content: reply.answer || t("emptyAnswer"),
          sources: reply.sources,
          suggestions: reply.suggestions,
        },
      ]);
      setStatus("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const code = error instanceof AssistantHttpError ? error.status : 0;
      setStatus(code === 429 ? "rateLimited" : code === 401 ? "sessionExpired" : "error");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  }

  function followSuggestion(s: AssistantSuggestion) {
    onNavigate();
    router.push(s.href);
    if (s.type === "highlight") highlightWhenReady(s.target);
  }

  async function copyDraft(draft: string, index: number) {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(index);
    } catch {
      setCopied(null);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setTurns([]);
    setStatus("idle");
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="gap-1 border-b border-border pe-12">
        <SheetTitle>{t("title")}</SheetTitle>
        <SheetDescription>{t("description")}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4" aria-live="polite">
        {turns.length === 0 && status === "idle" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{t("starters.title")}</p>
            {STARTERS.map((key) => (
              <Button
                key={key}
                variant="secondary"
                className="h-auto justify-start py-2 text-start whitespace-normal"
                onClick={() => void send(t(`starters.${key}`))}
              >
                {t(`starters.${key}`)}
              </Button>
            ))}
          </div>
        )}

        {turns.map((turn, index) =>
          turn.role === "user" ? (
            <div key={index} className="flex flex-col items-end gap-1">
              <span className="sr-only">{t("you")}</span>
              <p className="max-w-[85%] rounded-md bg-subtle px-3 py-2 text-sm whitespace-pre-wrap text-foreground">
                {turn.content}
              </p>
            </div>
          ) : (
            <div
              key={index}
              ref={index === turns.length - 1 ? lastTurnRef : undefined}
              className="flex scroll-mt-4 flex-col gap-3"
            >
              <span className="sr-only">{t("assistantName")}</span>
              <p className="text-sm leading-6 whitespace-pre-wrap text-foreground">
                {turn.content}
              </p>

              {turn.sources && turn.sources.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("sources")}</p>
                  <ul className="flex flex-wrap gap-2">
                    {turn.sources.map((source) => (
                      <li key={`${source.kind}-${source.id}`}>
                        <Link
                          href={source.href}
                          onClick={onNavigate}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-border bg-card px-2 text-xs text-foreground transition-colors hover:bg-subtle"
                        >
                          <span className="font-mono text-muted-foreground">[{source.ref}]</span>
                          <span>{t(`kinds.${source.kind}`)}</span>
                          <span
                            className={cn(
                              "max-w-40 truncate",
                              ID_LIKE.has(source.kind) && "font-mono",
                            )}
                          >
                            {source.kind === "page" ? source.href : source.label}
                          </span>
                          <LinkSimpleIcon className="size-3.5 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("noSources")}</p>
              )}

              {turn.suggestions && turn.suggestions.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">{t("prepared")}</p>
                  {turn.suggestions.map((s, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      {s.type === "draft" && (
                        <>
                          <p className="text-xs text-muted-foreground">{t("draftLabel")}</p>
                          <pre className="max-h-48 overflow-auto rounded-md border border-border bg-card p-3 font-mono text-xs whitespace-pre-wrap text-foreground">
                            {s.draft}
                          </pre>
                        </>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => followSuggestion(s)}>
                          <CursorClickIcon className="size-4" />
                          {s.label}
                        </Button>
                        {s.type === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void copyDraft(s.draft, index * 10 + i)}
                          >
                            <CopyIcon className="size-4" />
                            {copied === index * 10 + i ? t("draftCopied") : t("copyDraft")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {status === "loading" && (
          <div className="flex flex-col gap-2" role="status">
            <span className="text-xs text-muted-foreground">{t("thinking")}</span>
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {status === "unavailable" && (
          <div role="alert" className="flex gap-2 rounded-md border border-border bg-card p-3">
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-wait" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">{t("unavailableTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("unavailableBody")}</p>
            </div>
          </div>
        )}

        {(status === "rateLimited" || status === "sessionExpired" || status === "error") && (
          <div role="alert" className="flex gap-2 rounded-md border border-border bg-card p-3">
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-deny" />
            <p className="text-sm text-foreground">{t(status)}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-border p-4">
        <label htmlFor="assistant-input" className="sr-only">
          {t("inputLabel")}
        </label>
        <Textarea
          id="assistant-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("inputPlaceholder")}
          maxLength={4000}
          rows={2}
          className="resize-none"
          aria-describedby="assistant-hint"
        />
        <div className="flex items-center justify-between gap-2">
          <p id="assistant-hint" className="text-xs text-muted-foreground">
            {t("disclaimer")}
          </p>
          <div className="flex shrink-0 gap-2">
            {turns.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={reset}
                aria-label={t("newConversation")}
                title={t("newConversation")}
              >
                <ArrowCounterClockwiseIcon className="size-4" />
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!input.trim() || status === "loading"}>
              <PaperPlaneRightIcon className="size-4 rtl:-scale-x-100" />
              {t("send")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
