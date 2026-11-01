import { ShieldCheckIcon } from "@phosphor-icons/react/ssr";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { env } from "@/lib/env";
import type { AppLocale } from "@/i18n/routing";

interface Card {
  devices: number;
  actions: number;
  blocked: number;
  secretsKeptSafe: number;
}

async function load(slug: string): Promise<Card | null> {
  if (!/^[A-Za-z0-9_-]{16}$/.test(slug)) return null;
  const res = await fetch(`${env.MANAR_API_BASE_URL}/public/profile/${slug}`, {
    next: { revalidate: 300 },
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as Card) : null;
}

/** The opt-in public profile card: aggregate numbers only, no names. Public (see proxy.ts). */
export default async function ProfilePage({ params }: PageProps<"/[locale]/p/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("growth.card");
  const f = await getFormatter();
  const card = await load(slug);
  if (!card)
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">
        {t("notFound")}
      </main>
    );
  const rows: [string, number][] = [
    [t("devices"), card.devices],
    [t("actions"), card.actions],
    [t("blocked"), card.blocked],
    [t("secrets"), card.secretsKeptSafe],
  ];
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="flex items-center gap-3">
        <ShieldCheckIcon className="size-8 text-brand" aria-hidden />
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {rows.map(([label, n]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3">
            <dd className="text-2xl font-semibold tabular-nums">{f.number(n)}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      <a href="https://manar.vax.sh" className="text-sm text-primary underline">
        {t("cta")}
      </a>
    </main>
  );
}
