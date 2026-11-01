"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirmContactCode, useRequestContactCode } from "@/hooks/use-growth";

/** Two steps: the address, then the 6-digit code sent to it. */
export function ContactEmailForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("growth.contact");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const id = useId();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const request = useRequestContactCode();
  const confirm = useConfirmContactCode();
  const errorOf = (e: unknown) => {
    const m = (e as { message?: string } | null)?.message;
    return m &&
      ["code_wrong", "code_expired", "too_many_codes", "contact_email_invalid"].includes(m)
      ? m
      : "generic";
  };

  return sent ? (
    <form
      className="flex flex-col gap-2 sm:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        confirm.mutate(code, { onSuccess: () => onDone?.() });
      }}
    >
      <Label htmlFor={`${id}-c`}>{t("codeLabel", { email })}</Label>
      <Input
        id={`${id}-c`}
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        value={code}
        onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, ""))}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={code.length !== 6 || confirm.isPending}>
          {t("confirm")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setSent(false)}>
          {t("changeAddress")}
        </Button>
      </div>
      {confirm.isError && (
        <Alert role="alert">
          <AlertDescription>{t(`errors.${errorOf(confirm.error)}` as never)}</AlertDescription>
        </Alert>
      )}
    </form>
  ) : (
    <form
      className="flex flex-col gap-2 sm:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        request.mutate({ email, locale }, { onSuccess: () => setSent(true) });
      }}
    >
      <Label htmlFor={`${id}-e`}>{t("emailLabel")}</Label>
      <Input
        id={`${id}-e`}
        type="email"
        dir="ltr"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
      />
      <div>
        <Button type="submit" disabled={request.isPending}>
          {t("sendCode")}
        </Button>
      </div>
      {request.isError && (
        <Alert role="alert">
          <AlertDescription>{t(`errors.${errorOf(request.error)}` as never)}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
