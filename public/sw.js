/* Manar service worker: shows a notification for each web push and opens the console on click.
 * The payload carries no resource path, prompt or secret (manar-api src/push/push.service.ts). */
/* A push payload is data from the network: only a path on this origin may be opened. */
function safeUrl(value) {
  if (typeof value !== "string") return "/";
  try {
    const u = new URL(value, self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search : "/";
  } catch (_) {
    return "/";
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    return;
  }
  const url = safeUrl(data.url);
  event.waitUntil(
    self.registration.showNotification(String(data.title || "WARDEN").slice(0, 80), {
      body: String(data.body || "").slice(0, 160),
      tag: typeof data.tag === "string" ? data.tag : undefined,
      data: { url },
      silent: true, // sound is off unless the person enables the chime in the console
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c && new URL(c.url).origin === self.location.origin) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
