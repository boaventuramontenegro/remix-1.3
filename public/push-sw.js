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
      actions: Array.isArray(d.actions) ? d.actions : [],
      data: { url: d.url || "/inicio", occurrenceId: d.occurrenceId || null },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = data.url || "/inicio";
  if (event.action && data.occurrenceId) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}notificacao=${encodeURIComponent(event.action)}&ocorrencia=${encodeURIComponent(data.occurrenceId)}`;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
