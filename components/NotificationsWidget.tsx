"use client";

import { useEffect, useState } from "react";

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};

export function NotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    fetch("/api/notifications/mine")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications));
  }, []);

  async function markRead(id: string) {
    setNotifications((list) =>
      list ? list.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : list
    );
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  if (notifications === null) return null;
  if (notifications.length === 0) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-ink">
          الإشعارات {unreadCount > 0 && <span className="text-primary">({unreadCount} جديد)</span>}
        </h2>
      </div>
      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`w-full text-start rounded-lg border px-4 py-3 text-sm transition ${
              n.isRead ? "border-border text-ink-soft" : "border-primary/30 bg-primary-soft text-ink"
            }`}
          >
            <div className="flex items-center gap-2">
              {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-gradient-brand shrink-0" />}
              <p className="font-medium">{n.title}</p>
            </div>
            <p className="mt-1 text-ink-soft">{n.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
