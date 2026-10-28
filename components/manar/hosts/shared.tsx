"use client";

import type { FormEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api/errors";

export interface Option {
  value: string;
  label: string;
}

/** A Select that shows the option's label (Base UI would show the raw value). */
export function OptionSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}) {
  const labelOf = (v: string | null) => options.find((o) => o.value === v)?.label ?? null;
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger aria-label={ariaLabel} className={className}>
        <SelectValue placeholder={placeholder}>{labelOf}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Loading, error (with retry) or the children; the caller handles the empty case. */
export function QueryBlock({
  isPending,
  isError,
  error,
  refetch,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("hosts");
  const tCommon = useTranslations("common.actions");
  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        <span>{t("loadError")}</span>
        <span className="text-xs">{apiErrorMessage(error)}</span>
        <Button size="xs" variant="outline" onClick={refetch}>
          {tCommon("retry")}
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

/** A form in a dialog with an inline API error; the caller mounts it only while open. */
export function FormDialog({
  title,
  description,
  submitLabel,
  pending,
  error,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common.actions");
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error)}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tCommon("submitting") : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One address range per line (commas also split), blanks dropped. */
export function parseLines(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const shortFingerprint = (fp: string) => fp.slice(0, 12);
