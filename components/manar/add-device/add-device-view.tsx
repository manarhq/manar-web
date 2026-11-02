"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/telemetry/track";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";

import { Link } from "@/i18n/navigation";
import {
  ApiProblem,
  useInstallCode,
  useSetStartMode,
  useWaitingDevice,
} from "@/hooks/use-add-device";
import { useHostDecision } from "@/hooks/use-hosts";
import {
  DEFAULT_START_MODE,
  START_MODES,
  detectOs,
  oneLinerFor,
  type DeviceOs,
  type StartMode,
} from "@/lib/personal/add-device";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OSES: DeviceOs[] = ["windows11", "windows10", "linux"];

function StartModePicker() {
  const t = useTranslations("addDevice.step1");
  const [mode, setMode] = useState<StartMode>(DEFAULT_START_MODE);
  const save = useSetStartMode();
  const choose = (next: StartMode) => {
    const previous = mode;
    setMode(next);
    save.mutate(next, { onError: () => setMode(previous) });
  };
  return (
    <div className="grid content-start gap-4">
      <p className="text-xs tracking-wide text-muted-foreground">{t("step")}</p>
      <h2 className="text-xl font-medium">{t("title")}</h2>
      <div role="radiogroup" aria-label={t("title")} className="grid gap-3">
        {START_MODES.map((m) => {
          const selected = m === mode;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(m)}
              className={cn(
                "grid gap-1 rounded-[10px] border p-4 text-start",
                selected ? "border-brand bg-brand-soft" : "border-line bg-surface",
              )}
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                {t(`${m}.name`)}
                {m === DEFAULT_START_MODE && (
                  <span className="text-xs font-normal text-blue-text">{t("recommended")}</span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">{t(`${m}.body`)}</span>
            </button>
          );
        })}
      </div>
      {save.isError && (
        <p role="alert" className="text-sm text-deny">
          {t("saveFailed")}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t("changeLater")}</p>
    </div>
  );
}

function Waiting({ installKeyId, active }: { installKeyId?: string; active: boolean }) {
  const t = useTranslations("addDevice.step2");
  const device = useWaitingDevice(installKeyId, active);
  const decide = useHostDecision();
  const host = device.data;
  const found = host !== undefined;
  useEffect(() => {
    if (found) track("device_added");
  }, [found]);

  if (decide.isSuccess) {
    return (
      <div role="status" className="grid gap-3 rounded-[10px] border border-line bg-surface p-4">
        <p className="flex items-center gap-2 font-medium">
          <CheckIcon aria-hidden className="size-4 text-allow" />
          {t("approved", { name: host?.hostname ?? "" })}
        </p>
        <Link href="/home" className={buttonVariants({ variant: "default" })}>
          {t("goHome")}
        </Link>
      </div>
    );
  }
  if (host) {
    return (
      <div role="status" className="grid gap-3 rounded-[10px] border border-line bg-surface p-4">
        <p className="font-medium">{t("foundTitle")}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t("deviceName")}</dt>
          <dd dir="auto" className="break-all">
            {host.hostname}
          </dd>
          <dt className="text-muted-foreground">{t("deviceOs")}</dt>
          <dd dir="auto" className="break-all">
            {host.os}
          </dd>
        </dl>
        <p className="text-sm text-muted-foreground">{t("foundCheck")}</p>
        <Button
          onClick={() => decide.mutate({ id: host.id, decision: "approve" })}
          disabled={decide.isPending}
        >
          {t("approve")}
        </Button>
        {decide.isError && (
          <p role="alert" className="text-sm text-deny">
            {t("approveFailed")}
          </p>
        )}
      </div>
    );
  }
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-[10px] border border-dashed border-line bg-subtle p-3 text-sm"
    >
      <span aria-hidden className="size-2.5 shrink-0 animate-pulse rounded-full bg-brand" />
      <span>{t("waiting")}</span>
    </div>
  );
}

function AddDeviceStep() {
  const t = useTranslations("addDevice.step2");
  const code = useInstallCode();
  const [os, setOs] = useState<DeviceOs>("windows11");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      userAgentData?: { getHighEntropyValues(h: string[]): Promise<{ platformVersion?: string }> };
    };
    const set = (version?: string) => setOs(detectOs(nav.userAgent, version));
    if (nav.userAgentData) {
      nav.userAgentData.getHighEntropyValues(["platformVersion"]).then(
        (v) => set(v.platformVersion),
        () => set(),
      );
    } else set();
  }, []);

  const problem = code.error instanceof ApiProblem ? code.error : null;
  const line = code.data ? oneLinerFor(os, code.data) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the line is selectable in the box.
    }
  };

  return (
    <div className="grid content-start gap-4">
      <p className="text-xs tracking-wide text-muted-foreground">{t("step")}</p>
      <h2 className="text-xl font-medium">{t("title")}</h2>
      <div role="tablist" aria-label={t("osLabel")} className="flex flex-wrap gap-1.5">
        {OSES.map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={o === os}
            onClick={() => setOs(o)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-sm",
              o === os ? "border-brand bg-brand-soft" : "border-line text-muted-foreground",
            )}
          >
            {t(`os.${o}`)}
          </button>
        ))}
      </div>
      {problem?.body.code === "plan_limit_reached" ? (
        <p role="alert" className="text-sm">
          {t("limit")}{" "}
          <Link href="/settings/billing" className="text-blue-text underline">
            {t("upgrade")}
          </Link>
        </p>
      ) : code.isError ? (
        <div className="grid gap-2">
          <p role="alert" className="text-sm text-deny">
            {t("codeFailed")}
          </p>
          <Button variant="outline" onClick={() => void code.refetch()}>
            {t("tryAgain")}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {os === "linux" ? t("hintLinux") : t("hintWindows")}
          </p>
          <div className="flex items-stretch gap-2">
            <code
              dir="ltr"
              className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-line bg-ink px-3.5 py-3 font-mono text-[13px] text-ink-text"
            >
              {line || t("preparing")}
            </code>
            <Button onClick={copy} disabled={!line} aria-live="polite">
              {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <Waiting installKeyId={code.data?.installKeyId} active={!!code.data} />
        </>
      )}
      <Link href="/sample" className="text-sm text-blue-text">
        {t("sample")}
      </Link>
    </div>
  );
}

/** First run: pick how careful Manar is, then add the first device and approve it here. */
export function AddDeviceView() {
  return (
    <div className="grid overflow-hidden rounded-xl border border-line bg-card md:grid-cols-2 md:divide-x md:divide-line rtl:md:divide-x-reverse">
      <div className="p-6 md:p-8">
        <StartModePicker />
      </div>
      <div className="border-t border-line p-6 md:border-t-0 md:p-8">
        <AddDeviceStep />
      </div>
    </div>
  );
}
