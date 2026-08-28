"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications/mine")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  async function markRead(id: string) {
    setNotifications((list) => (list ? list.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : list));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="الإشعارات"
        className="relative grid place-items-center w-9 h-9 rounded-lg text-ink-soft hover:text-ink hover:bg-canvas transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-danger text-white text-[10px] font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-border bg-surface shadow-elevated overflow-hidden z-30 animate-scale-in">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="font-semibold text-ink text-sm">الإشعارات</p>
            {unreadCount > 0 && <span className="text-xs text-primary">{unreadCount} جديد</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="text-sm text-ink-soft text-center py-6">مفيش إشعارات دلوقتي.</p>
            ) : (
              notifications.slice(0, 6).map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`w-full text-start px-4 py-3 border-b border-border/60 last:border-0 transition ${
                    n.isRead ? "text-ink-soft" : "bg-primary-soft/50"
                  } hover:bg-canvas`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${n.isRead ? "text-ink-soft" : "text-ink"}`}>{n.title}</p>
                    <span className="text-[11px] text-ink-soft shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5 line-clamp-1">{n.body}</p>
                </button>
              ))
            )}
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block text-center text-sm text-primary py-2.5 border-t border-border hover:bg-canvas transition"
          >
            عرض كل الإشعارات
          </Link>
        </div>
      )}
    </div>
  );
}
