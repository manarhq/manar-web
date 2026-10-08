"use client";

import { useTranslations } from "next-intl";
import { QuestionIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTutorial } from "./tutorial-provider";

/** Topbar "Help" menu: start, resume or restart the console tour. */
export function TutorialHelpMenu() {
  const t = useTranslations("tutorial.help");
  const tour = useTutorial();
  if (!tour) return null;
  const started = tour.status === "running" || tour.status === "paused" || tour.status === "done";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t("label")} data-tour-help />}
      >
        <QuestionIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {tour.status === "paused" && (
          <DropdownMenuItem onClick={() => tour.dispatch({ type: "resume" })}>
            {t("resume")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => tour.dispatch({ type: "start" })}>
          {started ? t("restart") : t("start")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
