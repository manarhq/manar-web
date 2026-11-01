/* Manar service worker. Two jobs: show a notification for each web push (with Approve once / Deny
 * buttons when the push carries a single-use token), and open the console on click.
 *
 * It has NO fetch handler and never uses the Cache API: the console and the BFF answers are
 * authenticated, per-person data, so nothing is ever stored by the worker or served offline.
 * The payload carries no resource path, prompt or secret (manar-api src/push/push.service.ts). */

var TEXT = {
  en: {
    approve: "Approve once",
    deny: "Deny",
    approved: "Approved once.",
    denied: "Denied.",
    expired: "This request already timed out. It was denied.",
    failed: "Could not apply your answer. Open the console to check.",
  },
  ar: {
    approve: "موافقة لمرة واحدة",
    deny: "رفض",
    approved: "تمت الموافقة لمرة واحدة.",
    denied: "تم الرفض.",
    expired: "انتهت مهلة هذا الطلب وتم رفضه.",
    failed: "تعذر تطبيق ردك. افتح لوحة التحكم للتحقق.",
  },
};
function text() {
  var lang = (self.navigator && self.navigator.language) || "en";
  return String(lang).toLowerCase().indexOf("ar") === 0 ? TEXT.ar : TEXT.en;
}

/* A push payload is data from the network: only a path on this origin may be opened. */
function safeUrl(value) {
  if (typeof value !== "string") return "/";
  try {
    var u = new URL(value, self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search : "/";
  } catch {
    return "/";
  }
}

self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  var reg = self.registration;
  if (data.kind === "approval_closed" && typeof data.approvalId === "string") {
    /* Someone decided it (or it timed out): take its notification away. A push must show something,
     * so a throwaway one is shown and closed at once. */
    event.waitUntil(
      reg
        .getNotifications()
        .then(function (list) {
          list.forEach(function (n) {
            if (n.data && n.data.approvalId === data.approvalId) n.close();
          });
          return reg.showNotification("WARDEN", { tag: "closed", silent: true });
        })
        .then(function () {
          return reg.getNotifications({ tag: "closed" });
        })
        .then(function (list) {
          list.forEach(function (n) {
            n.close();
          });
        }),
    );
    return;
  }
  var url = safeUrl(data.url);
  var t = text();
  var live =
    typeof data.action === "string" &&
    typeof data.approvalId === "string" &&
    typeof data.expiresAt === "number" &&
    data.expiresAt > Date.now();
  var options = {
    body: String(data.body || "").slice(0, 160),
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: {
      url: url,
      approvalId: typeof data.approvalId === "string" ? data.approvalId : undefined,
      expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : undefined,
      action: live ? data.action : undefined,
    },
    silent: true, // sound is off unless the person enables the chime in the console
  };
  if (live) {
    options.actions = [
      { action: "approve_once", title: t.approve },
      { action: "deny", title: t.deny },
    ];
  }
  event.waitUntil(reg.showNotification(String(data.title || "WARDEN").slice(0, 80), options));
});

function say(message) {
  var reg = self.registration;
  return reg
    .showNotification("WARDEN", { body: message, tag: "approval-result", silent: true })
    .then(function () {
      return new Promise(function (resolve) {
        setTimeout(resolve, 5000);
      });
    })
    .then(function () {
      return reg.getNotifications({ tag: "approval-result" });
    })
    .then(function (list) {
      list.forEach(function (n) {
        n.close();
      });
    });
}

/* The button press goes to the BFF with the person's session cookie (same origin, so the BFF's
 * cross-site check passes) and the token from the push. manar-api accepts it once, for that person. */
function decide(token, decision, expiresAt, fallbackUrl) {
  var t = text();
  if (typeof expiresAt === "number" && expiresAt <= Date.now()) return say(t.expired);
  return fetch("/api/bff/phone/push-decide", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token, decision: decision }),
  })
    .then(function (res) {
      if (res.ok) return say(decision === "deny" ? t.denied : t.approved);
      if (res.status === 401) return self.clients.openWindow(fallbackUrl); // signed out: sign in, then decide
      return say(res.status === 409 ? t.expired : t.failed);
    })
    .catch(function () {
      return say(t.failed);
    });
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var d = event.notification.data || {};
  var url = safeUrl(d.url);
  if (
    (event.action === "approve_once" || event.action === "deny") &&
    typeof d.action === "string"
  ) {
    event.waitUntil(decide(d.action, event.action, d.expiresAt, url));
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i += 1) {
        var c = list[i];
        if ("focus" in c && new URL(c.url).origin === self.location.origin) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
