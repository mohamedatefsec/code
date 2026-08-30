"use client";

import { useEffect, useState } from "react";

type Notification = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  isRead: boolean;
};

export function NotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    <div className="h-full rounded-xl border border-border bg-surface p-4 sm:p-6 shadow-elevated">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid place-items-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent-soft text-accent">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
              <path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </span>
          الإشعارات {unreadCount > 0 && <span className="text-primary">({unreadCount})</span>}
        </h2>
      </div>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`w-full rounded-lg border px-3 sm:px-4 py-2 sm:py-3 text-sm transition ${
              n.isRead ? "border-border text-ink-soft" : "border-primary/30 bg-primary-soft text-ink"
            }`}
          >
            <button onClick={() => markRead(n.id)} className="w-full text-start">
              <div className="flex items-center gap-2">
                {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-gradient-brand shrink-0" />}
                <p className="font-medium">{n.title}</p>
              </div>
              <p className="mt-1 text-ink-soft">{n.body}</p>
            </button>
            {n.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- صورة مرفوعة من الأدمن، لا تحتاج next/image
              <img
                src={n.imageUrl}
                alt={n.title}
                onClick={() => {
                  markRead(n.id);
                  setPreviewImage(n.imageUrl);
                }}
                className="mt-2 max-h-40 rounded-lg border border-border object-cover cursor-zoom-in hover:opacity-90 transition"
              />
            )}
          </div>
        ))}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/90 hover:text-white text-2xl leading-none"
            aria-label="إغلاق"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- معاينة صورة إشعار مرفوعة من الأدمن */}
          <img
            src={previewImage}
            alt="معاينة الصورة"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
