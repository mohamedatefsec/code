"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} ${mins === 1 ? "دقيقة" : "دقايق"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

export function NotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  async function markAllRead() {
    const unread = notifications?.filter((n) => !n.isRead) ?? [];
    if (unread.length === 0) return;
    setNotifications((list) => (list ? list.map((n) => ({ ...n, isRead: true })) : list));
    await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}/read`, { method: "POST" })));
  }

  if (notifications === null) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevated">
        <div className="h-5 w-32 skeleton rounded-md mb-4" />
        <div className="space-y-3">
          <div className="h-16 skeleton rounded-xl" />
          <div className="h-16 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevated text-center">
        <div className="mx-auto mb-2 grid place-items-center w-12 h-12 rounded-full bg-primary-soft text-primary">
          <BellIcon className="w-6 h-6" />
        </div>
        <p className="text-sm text-ink-soft">مفيش إشعارات جديدة دلوقتي.</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevated relative overflow-hidden">
      <div
        className="absolute -top-10 -end-10 w-32 h-32 rounded-full opacity-[0.08] blur-2xl pointer-events-none"
        style={{ background: "var(--color-primary)" }}
      />
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-2.5">
          <div className="relative grid place-items-center w-10 h-10 rounded-xl bg-gradient-brand text-white shadow-glow">
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 grid place-items-center rounded-full bg-danger text-white text-[11px] font-bold animate-pulse-glow">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-bold text-ink text-base">الإشعارات</h2>
            <p className="text-xs text-ink-soft">
              {unreadCount > 0 ? `${unreadCount} إشعار جديد لسه مقروتوش` : "كل الإشعارات مقروءة"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
          >
            تعليم الكل كمقروء
          </button>
        )}
      </div>

      <div className="space-y-3 relative">
        <AnimatePresence initial={false}>
          {notifications.map((n, i) => {
            const isOpen = expanded === n.id;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <button
                  onClick={() => {
                    setExpanded(isOpen ? null : n.id);
                    if (!n.isRead) markRead(n.id);
                  }}
                  className={`w-full text-start rounded-xl border p-4 transition-all ${
                    n.isRead
                      ? "border-border bg-canvas/40 hover:bg-canvas"
                      : "border-primary/30 bg-primary-soft hover:border-primary/50 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 shrink-0 grid place-items-center w-9 h-9 rounded-lg ${
                        n.isRead ? "bg-surface-2 text-ink-soft" : "bg-primary text-white"
                      }`}
                    >
                      <BellIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-semibold ${n.isRead ? "text-ink-soft" : "text-ink"}`}>{n.title}</p>
                        <span className="text-[11px] text-ink-soft shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p
                        className={`mt-1.5 text-sm text-ink-soft leading-6 ${
                          isOpen ? "" : "line-clamp-2"
                        }`}
                      >
                        {n.body}
                      </p>
                      {!isOpen && n.body.length > 90 && (
                        <span className="text-xs text-primary mt-1 inline-block">عرض المزيد</span>
                      )}
                    </div>
                    {!n.isRead && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-gradient-brand shrink-0" />
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path
        d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
