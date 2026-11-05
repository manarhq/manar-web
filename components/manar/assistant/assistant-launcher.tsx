"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { ChatCircleTextIcon } from "@phosphor-icons/react/ssr";

import { isRtlLocale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ASSISTANT_OPEN_EVENT, openAssistant, type AssistantOpenDetail } from "./assistant-api";

// The panel (chat, markdown, streaming) loads when first opened, not with every page.
const AssistantPanel = dynamic(() => import("./assistant-panel").then((m) => m.AssistantPanel), {
  ssr: false,
});

/**
 * The assistant's one mount point in the shell (top bar): a trigger button,
 * Ctrl/Cmd+J, and the `openAssistant` API (exported, on `window`, and the
 * `manar:assistant:open` event) used by the tutorial. Opens a Sheet on the
 * reading-end edge: right in English, left in Arabic.
 */
const noopSubscribe = () => () => {};

export function AssistantLauncher({ scope }: { scope: string }) {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  // Server render and hydration show "Ctrl J"; the client then switches to the Mac key if needed.
  const isMac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => false,
  );

  useEffect(() => {
    function onOpen(event: Event) {
      const prompt = (event as CustomEvent<AssistantOpenDetail | undefined>).detail?.prompt;
      if (typeof prompt === "string" && prompt.trim()) {
        setPrefill({ text: prompt.slice(0, 4000), nonce: Date.now() });
      }
      setOpen(true);
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener(ASSISTANT_OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKeyDown);
    window.openAssistant = openAssistant;
    return () => {
      window.removeEventListener(ASSISTANT_OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKeyDown);
      if (window.openAssistant === openAssistant) delete window.openAssistant;
    };
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        data-tour="assistant"
        aria-label={t("triggerLabel")}
        aria-keyshortcuts={isMac ? "Meta+J" : "Control+J"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ChatCircleTextIcon className="size-4" />
        <span className="hidden md:inline">{t("trigger")}</span>
        <kbd className="hidden rounded-sm border border-border px-1 font-mono text-2xs text-muted-foreground lg:inline">
          {isMac ? "⌘J" : "Ctrl J"}
        </kbd>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isRtlLocale(locale) ? "left" : "right"}
          closeLabel={t("close")}
          className="gap-0 p-0 data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-md data-[side=right]:sm:max-w-md"
        >
          <AssistantPanel
            // A new prefill remounts the panel so the input starts from it; the conversation reloads from session storage.
            key={prefill?.nonce ?? 0}
            scope={scope}
            prefill={prefill}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
