// Service Worker مسؤول بس عن استقبال إشعارات Push وعرضها، وفتح المنصة لو
// الطالب ضغط على الإشعار. متعمّدين نسيبه بسيط وما نتدخّلش في تخزين مؤقّت
// (caching) للصفحات هنا عشان نتجنّب مشاكل عرض نسخة قديمة من المنصة.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "إشعار جديد", body: event.data.text() };
  }

  const title = payload.title || "إشعار جديد";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      // لو فيه تاب مفتوح بالفعل من نفس المنصة، نركّز عليه بدل ما نفتح تاب
      // جديد كل مرة.
      for (const client of allClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});
