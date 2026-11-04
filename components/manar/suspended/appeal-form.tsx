"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const MAX_APPEAL = 2000;
/** Outside render purity checks: the page is dynamic and reads the clock per request. */
const inFuture = (iso: string) => Date.parse(iso) > Date.now();
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Loads Turnstile once and renders it into `el`; calls back with the token (or "" on expiry). */
function useTurnstile(siteKey: string, onToken: (token: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | undefined;
    const mount = () => {
      if (!ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (t: string) => onToken(t),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    if (window.turnstile) mount();
    else {
      // Created by this (nonced) bundle, so strict-dynamic lets it run.
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      if (!s) {
        s = document.createElement("script");
        s.src = SCRIPT;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", mount);
    }
    return () => {
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, onToken]);
  return ref;
}

/**
 * The appeal (DESK spec 9.4): up to 2,000 characters, a Turnstile check, one every 24 hours.
 * Submit stays disabled until Turnstile has given a token and there is text.
 */
export function AppealForm({
  siteKey,
  appeal,
  availableAt,
  nextAt,
}: {
  siteKey: string;
  appeal: { code: string; status: string; dueAt: string } | null;
  availableAt: string;
  nextAt: string;
}) {
  const t = useTranslations("suspended.appeal");
  const format = useFormatter();
  const [text, setText] = useState("");
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "limited">("idle");
  const [sent, setSent] = useState<{ code: string } | null>(null);
  const widget = useTurnstile(siteKey, setToken);
  const waiting = inFuture(availableAt);

  if (sent || appeal?.status === "OPEN")
    return (
      <div className="flex flex-col gap-2" role="status" data-testid="appeal-received">
        <h2 className="text-base font-semibold">{t("received.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("received.body", { code: sent?.code ?? appeal!.code })}
          {appeal?.status === "OPEN" ? ` ${t("received.due", { due: appeal.dueAt })}` : ""}
        </p>
      </div>
    );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        const res = await fetch("/api/bff/me/appeals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim(), turnstileToken: token }),
        }).catch(() => null);
        if (res?.ok) {
          setSent((await res.json()) as { code: string });
          setState("sent");
        } else {
          setState(res?.status === 429 ? "limited" : "error");
          setToken("");
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("body")}</p>
        {appeal && (
          <p className="text-sm text-muted-foreground">{t(`previous.${appeal.status}`)}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="appeal-text">{t("message")}</Label>
        <Textarea
          id="appeal-text"
          rows={6}
          maxLength={MAX_APPEAL}
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="appeal-text"
        />
        <span className="text-xs text-muted-foreground">
          {t("count", { count: format.number(text.length), max: format.number(MAX_APPEAL) })}
        </span>
      </div>
      <div ref={widget} data-testid="turnstile" />
      {!siteKey && <p className="text-sm text-destructive">{t("noCheck")}</p>}
      {state === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {t("error")}
        </p>
      )}
      {(state === "limited" || waiting) && (
        <p className="text-sm text-muted-foreground" role="alert">
          {t("limited", { at: nextAt })}
        </p>
      )}
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">{t("once")}</span>
        <span className="flex-1" />
        <Button
          type="submit"
          disabled={!token || !text.trim() || waiting || state === "sending"}
          data-testid="appeal-submit"
        >
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
