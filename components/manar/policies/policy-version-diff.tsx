"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { diffLines } from "@/lib/diff";
import { cn } from "@/lib/utils";
import type { PolicyVersion } from "@/hooks/use-policies";

function canonicalJson(version: PolicyVersion): string {
  return JSON.stringify(version.content, null, 2);
}

export function PolicyVersionDiff({ versions }: { versions: PolicyVersion[] }) {
  const t = useTranslations("policies.detail");
  const [fromId, setFromId] = useState<string>(versions[1]?.id ?? versions[0]?.id ?? "");
  const [toId, setToId] = useState<string>(versions[0]?.id ?? "");

  const from = versions.find((v) => v.id === fromId);
  const to = versions.find((v) => v.id === toId);

  const lines = useMemo(() => {
    if (!from || !to) return null;
    return diffLines(canonicalJson(from), canonicalJson(to));
  }, [from, to]);

  const changed = lines?.some((line) => line.kind !== "same") ?? false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("diffFromLabel")}</span>
          <Select value={fromId} onValueChange={(value) => setFromId(value ?? "")}>
            <SelectTrigger className="w-28">
              {/* Base UI's SelectValue shows the raw selected value (a
               * version UUID) unless given a render function — mapped
               * back to "v{n}" here instead of leaking the raw id. */}
              <SelectValue>
                {(value: string | null) => {
                  const v = versions.find((candidate) => candidate.id === value);
                  return v ? `v${v.version}` : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("diffToLabel")}</span>
          <Select value={toId} onValueChange={(value) => setToId(value ?? "")}>
            <SelectTrigger className="w-28">
              <SelectValue>
                {(value: string | null) => {
                  const v = versions.find((candidate) => candidate.id === value);
                  return v ? `v${v.version}` : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!lines ? (
        <p className="text-sm text-muted-foreground">{t("diffEmpty")}</p>
      ) : !changed ? (
        <p className="text-sm text-muted-foreground">{t("diffSame")}</p>
      ) : (
        // Forced LTR regardless of page locale, same reasoning as
        // policy-detail-view.tsx's VersionContentViewer: a raw JSON diff
        // dump, not prose — under dir="rtl" the browser's bidi algorithm
        // would reorder this block's lines.
        <pre
          dir="ltr"
          className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed"
        >
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "px-1",
                line.kind === "added" && "bg-risk-minimal/15 text-risk-minimal",
                line.kind === "removed" && "bg-risk-critical/15 text-risk-critical",
              )}
            >
              {line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  "}
              {line.text}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
