/* Notificações do Meu Bolso (importado pelo service worker principal). */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(d.title || "Meu Bolso", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      // Android's small icon uses only alpha: no opaque app-icon background.
      badge: "/icons/notification-wallet-v1.png",
      tag: d.tag,
      data: { url: d.url || "/inicio" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/inicio";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
