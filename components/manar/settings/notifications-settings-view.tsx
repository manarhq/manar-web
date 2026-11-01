"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chimeEnabled, playChime, setChime } from "@/lib/push/chime";
import { currentPushState, disablePush, enablePush, type PushState } from "@/lib/push/subscribe";

/** Settings, Notifications: browser notifications for approvals and the opt-in chime. There is no
 * email for approvals (decision #32) and the chime is off until turned on (decision #59). */
export function NotificationsSettingsView() {
  const t = useTranslations("settings.notifications");
  const [state, setState] = useState<PushState | null>(null);
  const [chime, setChimeState] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void currentPushState().then(setState);
    // Browser storage can only be read after mount (server and first client render must match).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChimeState(chimeEnabled(window.localStorage));
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("browserTitle")}</CardTitle>
          <CardDescription>{t("browserBody")}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
          <p role="status" className="text-sm text-muted-foreground">
            {state ? t(`state.${state}`) : ""}
          </p>
          {(state === "on" || state === "off") && (
            <Button
              variant={state === "on" ? "outline" : "primary"}
              disabled={busy}
              onClick={toggle}
            >
              {state === "on" ? t("turnOff") : t("turnOn")}
            </Button>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("chimeTitle")}</CardTitle>
          <CardDescription>{t("chimeBody")}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={chime}
              onChange={(e) => {
                setChime(window.localStorage, e.target.checked);
                setChimeState(e.target.checked);
                if (e.target.checked) playChime();
              }}
            />
            {t("chimeLabel")}
          </label>
        </div>
      </Card>
    </div>
  );
}
