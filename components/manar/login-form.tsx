"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { EnvelopeSimpleIcon, GithubLogoIcon, WindowsLogoIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";

type AuthErrorKey = "callbackFailed" | "sessionExpired" | "unavailable";

export interface LoginFormProps {
  errorKey?: AuthErrorKey;
}

const METHODS = [
  { id: "microsoft", Icon: WindowsLogoIcon },
  { id: "github", Icon: GithubLogoIcon },
  { id: "email", Icon: EnvelopeSimpleIcon },
] as const;

/**
 * Sign in without a workspace ID: three buttons that POST to /api/auth/login with the chosen
 * method. The response is a redirect to the shared realm; Manar never renders a password form.
 */
export function LoginForm({ errorKey }: LoginFormProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      method="POST"
      action="/api/auth/login"
      onSubmit={() => setSubmitting(true)}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <input type="hidden" name="locale" value={locale} />
      {METHODS.map(({ id, Icon }) => (
        <Button
          key={id}
          type="submit"
          name="method"
          value={id}
          variant="outline"
          disabled={submitting}
          className="w-full justify-start gap-3"
        >
          <Icon className="size-5" />
          {t(`methods.${id}`)}
        </Button>
      ))}

      {errorKey && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t(`errors.${errorKey}`)}
        </p>
      )}
      <p className="text-xs text-balance text-muted-foreground">{t("separateAccounts")}</p>
    </form>
  );
}
