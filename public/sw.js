self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: "Convogram", body: "Incoming call" }; }
  const title = data.title || "Convogram call";
  const options = {
    body: data.body || "Incoming call",
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || `convogram-call-${data.callId || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || "/",
      callId: data.callId || null,
      type: data.type || "voice",
      conversationId: data.conversationId || null,
      callerName: data.callerName || "Contact",
    },
    actions: [
      { action: "answer", title: "Answer" },
      { action: "decline", title: "Decline" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => "focus" in client);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: "convogram-call-notification", action: event.action || "open", ...data });
      return;
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
