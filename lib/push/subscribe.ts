import { BffError, bffJson } from "@/lib/api/raw";

/** The browser's push key format (URL-safe base64) as bytes for `applicationServerKey`. */
export function urlBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushState = "unsupported" | "off" | "on" | "blocked" | "not-configured";

/** What the browser and Manar say right now. */
export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Asks permission, subscribes this browser and tells manar-api. Returns the new state. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const key = await bffJson<{ enabled: boolean; publicKey: string | null }>("/push/vapid-key");
  if (!key.enabled || !key.publicKey) return "not-configured";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(key.publicKey),
    }));
  const json = sub.toJSON();
  await bffJson("/push/subscriptions", {
    method: "POST",
    body: { endpoint: json.endpoint, keys: json.keys },
  });
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try {
      await bffJson("/push/subscriptions", { method: "DELETE", body: { endpoint: sub.endpoint } });
    } catch (error) {
      if (!(error instanceof BffError)) throw error;
    }
    await sub.unsubscribe();
  }
  return "off";
}

const PROMPTED_KEY = "manar.push.prompted";

/** True once: the first approval is the moment to offer notifications, never before and never again. */
export function shouldOfferPush(storage: Pick<Storage, "getItem" | "setItem">): boolean {
  if (!pushSupported() || Notification.permission !== "default") return false;
  if (storage.getItem(PROMPTED_KEY)) return false;
  storage.setItem(PROMPTED_KEY, "1");
  return true;
}
