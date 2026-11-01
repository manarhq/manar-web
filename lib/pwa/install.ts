/** Install-on-phone state. Chrome and Edge fire `beforeinstallprompt` once, early, so it is
 * captured at app start (PwaBoot) and the settings card reads it later. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export type InstallState = "installed" | "available" | "ios" | "manual";

export function captureInstallPrompt(): () => void {
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function installState(): InstallState {
  if (typeof window === "undefined") return "manual";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (deferred) return "available";
  // iPhone and iPad (iPadOS reports a Mac with touch): Safari's Share sheet is the only way.
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "manual";
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  notify();
  return outcome === "accepted";
}
