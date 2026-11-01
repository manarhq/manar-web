/**
 * Which workspace the sign-in is looking at is the identity track's switcher. Until it lands,
 * the sample entry records the sample workspace id here so the banner can show, and so Home can
 * be pointed at it. When the switcher exists, replace the body of these two functions.
 */
const KEY = "manar.sample";

export function markSample(tenantId: string | null): void {
  if (typeof window === "undefined") return;
  if (tenantId) window.sessionStorage.setItem(KEY, tenantId);
  else window.sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("manar-sample"));
}

export function sampleSnapshot(): string | null {
  return typeof window === "undefined" ? null : window.sessionStorage.getItem(KEY);
}

export function subscribeSample(cb: () => void): () => void {
  window.addEventListener("manar-sample", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("manar-sample", cb);
    window.removeEventListener("storage", cb);
  };
}
