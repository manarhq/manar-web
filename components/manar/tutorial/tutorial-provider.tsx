"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CheckCircleIcon, CircleDashedIcon, XIcon } from "@phosphor-icons/react/ssr";

import { Link, usePathname } from "@/i18n/navigation";
import { isRtlLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  assistantAvailable,
  currentIndex,
  loadTourState,
  openAssistant,
  reduceTour,
  resolveTarget,
  saveTourState,
  stepsFor,
  storageKey,
  type TourAction,
  type TourState,
  type TourStatus,
  type TourStep,
} from "./engine";
import { Practice } from "./practice";

interface TutorialContextValue {
  status: TourStatus;
  dispatch: (action: TourAction) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

/** Null outside the app shell, and until progress has been read from storage. */
export function useTutorial(): TutorialContextValue | null {
  return useContext(TutorialContext);
}

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Ring drawn on the step's target. An attribute, not a wrapper, so no page markup changes. */
const HIGHLIGHT_CSS =
  "[data-tour-active]{outline:2px solid var(--focus);outline-offset:2px;border-radius:6px}";

export interface TutorialProviderProps {
  /** Tenant slug: progress is kept per tenant and user. */
  scope: string;
  userId: string;
  roles: readonly string[];
  children: ReactNode;
}

/**
 * Hands-on console tour (agent TU). Mounted once in the app shell, so it
 * survives client navigation between pages. It never blocks the console:
 * the card is non-modal and the page stays usable around it.
 */
export function TutorialProvider({ scope, userId, roles, children }: TutorialProviderProps) {
  const t = useTranslations("tutorial");
  const pathname = usePathname();
  const key = storageKey(scope, userId);
  const [state, setState] = useState<TourState | null>(null);
  const [assistant, setAssistant] = useState(false);
  const [target, setTarget] = useState<Element | null>(null);

  const steps = useMemo(
    () => stepsFor({ roles, assistantAvailable: assistant }),
    [roles, assistant],
  );

  // Storage only exists in the browser, so progress is read after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage
    setState(loadTourState(browserStorage(), key));
    setAssistant(assistantAvailable());
  }, [key]);

  useEffect(() => {
    if (state) saveTourState(browserStorage(), key, state);
  }, [key, state]);

  const dispatch = useCallback(
    (action: TourAction) => setState((current) => current && reduceTour(current, action, steps)),
    [steps],
  );

  const running = state?.status === "running";
  const index = running ? currentIndex(state, steps) : -1;
  const step: TourStep | undefined = steps[index];
  const task = step?.task;
  // A path task is done while the user is on that page; no state to keep in sync.
  const done =
    !!step &&
    (!!state?.completed.includes(step.id) ||
      (task?.kind === "path" && task.pattern.test(pathname)));

  // ponytail: 500 ms polling for the target and the assistant; a MutationObserver if it ever shows in a profile.
  useEffect(() => {
    if (!step) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the ring when the tour stops
      setTarget(null);
      return;
    }
    const tick = () => {
      setTarget(resolveTarget(step));
      setAssistant(assistantAvailable());
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!target) return;
    target.setAttribute("data-tour-active", "");
    target.scrollIntoView?.({ block: "nearest" });
    return () => target.removeAttribute("data-tour-active");
  }, [target]);

  useEffect(() => {
    if (!step || task?.kind !== "click") return;
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(task.selector)) {
        dispatch({ type: "complete", id: step.id });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [step, task, dispatch]);

  const pause = useCallback(() => {
    dispatch({ type: "pause" });
    // The card unmounts: hand focus to the Help button that resumes it.
    document.querySelector<HTMLElement>("[data-tour-help]")?.focus();
  }, [dispatch]);

  const context = useMemo(
    () => (state ? { status: state.status, dispatch } : null),
    [state, dispatch],
  );

  let announcement = "";
  if (step) {
    const title = t(`steps.${step.id}.title` as "steps.welcome.title");
    announcement = done
      ? t("card.announceDone", { title })
      : t("card.announce", { current: index + 1, total: steps.length, title });
  } else if (state?.status === "paused") announcement = t("card.paused");
  else if (state?.status === "done") announcement = t("card.finished");

  const card = step && (
    <TourCard
      step={step}
      index={index}
      total={steps.length}
      done={done}
      targetFound={!!target}
      pathname={pathname}
      onNext={() => dispatch({ type: "next" })}
      onBack={() => dispatch({ type: "back" })}
      onPause={pause}
      onComplete={() => dispatch({ type: "complete", id: step.id })}
    />
  );

  return (
    <TutorialContext.Provider value={context}>
      {children}
      <div aria-live="polite" className="sr-only" data-testid="tutorial-announcer">
        {announcement}
      </div>
      {state?.status === "offer" && <TourOffer dispatch={dispatch} />}
      {running && <style>{HIGHLIGHT_CSS}</style>}
      {card &&
        (target ? (
          <PopoverPrimitive.Root open modal={false}>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Positioner
                anchor={target}
                side={step.side ?? "bottom"}
                align="start"
                sideOffset={8}
                collisionPadding={16}
                className="isolate z-50"
              >
                <PopoverPrimitive.Popup
                  initialFocus={false}
                  finalFocus={false}
                  className="outline-none"
                >
                  {card}
                </PopoverPrimitive.Popup>
              </PopoverPrimitive.Positioner>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        ) : (
          // Missing target: centred, but only the card takes pointer events.
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <div className="pointer-events-auto">{card}</div>
          </div>
        ))}
    </TutorialContext.Provider>
  );
}

interface TourCardProps {
  step: TourStep;
  index: number;
  total: number;
  done: boolean;
  targetFound: boolean;
  pathname: string;
  onNext: () => void;
  onBack: () => void;
  onPause: () => void;
  onComplete: () => void;
}

function TourCard({
  step,
  index,
  total,
  done,
  targetFound,
  pathname,
  onNext,
  onBack,
  onPause,
  onComplete,
}: TourCardProps) {
  const t = useTranslations("tutorial");
  const rtl = isRtlLocale(useLocale());
  const ref = useRef<HTMLDivElement>(null);
  const titleId = `tour-title-${step.id}`;
  const s = (field: "title" | "body" | "task") =>
    t(`steps.${step.id}.${field}` as "steps.welcome.title");
  const last = index === total - 1;
  const pending = !!step.task && !done;
  const practice = step.task?.kind === "practice" ? step.task.practice : null;

  // Each new step takes focus, so keyboard and screen reader users land on it.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [step.id]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onPause();
      return;
    }
    if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward) onNext();
    else if (event.key === backward && index > 0) onBack();
    // Buttons handle Enter themselves; Enter on the card itself moves on.
    else if (event.key === "Enter" && event.target === event.currentTarget) onNext();
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-testid="tour-card"
      data-tour-step={step.id}
      className={cn(
        "flex max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-md border border-border bg-popover p-4 text-sm text-popover-foreground elevation-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        practice ? "w-96" : "w-80",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {t("card.progress", { current: index + 1, total })}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={t("card.pause")} onClick={onPause}>
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="h-1 rounded-sm bg-subtle" aria-hidden>
        <div
          className="h-1 rounded-sm bg-ink"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <h2 id={titleId} className="text-base font-semibold">
        {s("title")}
      </h2>
      <p className="text-muted-foreground">{s("body")}</p>

      {step.id === "labels" && <LabelsLegend />}

      {step.task && step.task.kind !== "practice" && step.task.kind !== "assistant" && (
        <p className="flex items-start gap-2 text-sm">
          {done ? (
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-allow" aria-hidden />
          ) : (
            <CircleDashedIcon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          )}
          <span>
            <span className="font-medium">{done ? t("card.done") : t("card.yourTurn")}:</span>{" "}
            {s("task")}
          </span>
        </p>
      )}

      {practice && <Practice kind={practice} onDone={onComplete} />}

      {step.task?.kind === "assistant" && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => {
            openAssistant(t("steps.assistant.prompt"));
            onComplete();
          }}
        >
          {t("steps.assistant.ask")}
        </Button>
      )}

      {!targetFound && step.targets && (
        <p className="text-xs text-muted-foreground">
          {t("card.notOnPage")}{" "}
          {step.href && pathname !== step.href && (
            <Link href={step.href} className="font-medium text-foreground underline">
              {t("card.goThere")}
            </Link>
          )}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        {index > 0 ? (
          <Button variant="ghost" size="sm" onClick={onBack}>
            {t("card.back")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">{t("card.keys")}</span>
        )}
        <Button size="sm" variant={pending ? "secondary" : "default"} onClick={onNext}>
          {last ? t("card.finish") : pending ? t("card.skip") : t("card.next")}
        </Button>
      </div>
    </div>
  );
}

function LabelsLegend() {
  const t = useTranslations("tutorial.labels");
  const rows = [
    ["governed", "allow"],
    ["observedOnly", "wait"],
    ["declaredOnly", "neutral"],
    ["unavailable", "deny"],
  ] as const;
  return (
    <dl className="flex flex-col gap-2">
      {rows.map(([label, variant]) => (
        <div key={label} className="flex flex-col gap-1">
          <dt>
            <Badge variant={variant}>{t(label)}</Badge>
          </dt>
          <dd className="text-xs text-muted-foreground">{t(`${label}Hint`)}</dd>
        </div>
      ))}
    </dl>
  );
}

function TourOffer({ dispatch }: { dispatch: (action: TourAction) => void }) {
  const t = useTranslations("tutorial.offer");
  return (
    <section
      aria-labelledby="tour-offer-title"
      data-testid="tour-offer"
      className="fixed end-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-md border border-border bg-popover p-4 text-sm text-popover-foreground elevation-2"
    >
      <h2 id="tour-offer-title" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="text-muted-foreground">{t("body")}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => dispatch({ type: "start" })}>
          {t("start")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "dismiss" })}>
          {t("later")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("laterHint")}</p>
    </section>
  );
}
