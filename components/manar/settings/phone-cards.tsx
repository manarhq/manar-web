"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BffError, bffJson } from "@/lib/api/raw";
import { installState, promptInstall, subscribeInstall } from "@/lib/pwa/install";

/** Settings, Notifications: put Manar on the phone's home screen so approvals arrive as push. */
export function InstallOnPhoneCard() {
  const t = useTranslations("settings.phone.install");
  const state = useSyncExternalStore(subscribeInstall, installState, () => "manual" as const);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p role="status" className="text-sm text-muted-foreground">
          {t(`state.${state}`)}
        </p>
        {state === "available" && (
          <div>
            <Button variant="primary" onClick={() => void promptInstall()}>
              {t("install")}
            </Button>
          </div>
        )}
        {(state === "ios" || state === "manual") && (
          <ol className="list-decimal ps-5 text-sm">
            {(state === "ios" ? ["ios1", "ios2", "ios3"] : ["other1", "other2"]).map((k) => (
              <li key={k}>{t(`steps.${k}`)}</li>
            ))}
          </ol>
        )}
        <p className="text-sm text-muted-foreground">{t("then")}</p>
      </div>
    </Card>
  );
}

interface LinkStatus {
  enabled: boolean;
  linked: number;
  botUsername?: string;
}
interface LinkCode {
  code: string;
  url: string;
  expiresAt: string;
}

/** Settings, Notifications: link a Telegram chat. The code is one-time and valid for 10 minutes. */
export function TelegramCard() {
  const t = useTranslations("settings.phone.telegram");
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [code, setCode] = useState<LinkCode | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void bffJson<LinkStatus>("/telegram/link")
      .then(setStatus)
      .catch(() => setStatus({ enabled: false, linked: 0 }));
  }, []);

  // While a code is showing, watch for the chat to link.
  useEffect(() => {
    if (!code) return;
    const timer = setInterval(() => {
      if (new Date(code.expiresAt).getTime() < Date.now()) {
        setCode(null);
        return;
      }
      void bffJson<LinkStatus>("/telegram/link")
        .then((s) => {
          if (s.linked > 0) {
            setStatus(s);
            setCode(null);
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [code]);

  async function makeCode() {
    setBusy(true);
    try {
      setCode(await bffJson<LinkCode>("/telegram/link", { method: "POST" }));
    } catch (error) {
      toast.error(error instanceof BffError && error.status === 429 ? t("tooMany") : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await bffJson("/telegram/link", { method: "DELETE" });
      setStatus((s) => (s ? { ...s, linked: 0 } : s));
      setCode(null);
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p role="status" className="text-sm text-muted-foreground">
          {status === null
            ? ""
            : !status.enabled
              ? t("state.off")
              : status.linked > 0
                ? t("state.linked")
                : t("state.unlinked")}
        </p>
        {status?.enabled && status.linked > 0 && (
          <div>
            <Button variant="outline" disabled={busy} onClick={unlink}>
              {t("unlink")}
            </Button>
          </div>
        )}
        {status?.enabled && status.linked === 0 && !code && (
          <div>
            <Button variant="primary" disabled={busy} onClick={makeCode}>
              {t("link")}
            </Button>
          </div>
        )}
        {code && (
          <div className="flex flex-col gap-2 text-sm">
            <p>{t("send", { bot: status?.botUsername ?? "" })}</p>
            <p className="font-mono text-lg tracking-widest" dir="ltr">
              /start {code.code.replace("-", "")}
            </p>
            <a className="link-text" href={code.url} target="_blank" rel="noreferrer">
              {t("open")}
            </a>
            <p className="text-muted-foreground">{t("expires")}</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">{t("privacy")}</p>
      </div>
    </Card>
  );
}
