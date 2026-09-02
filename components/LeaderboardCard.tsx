"use client";

import { motion } from "framer-motion";

export type LeaderboardEntry = {
  id: string;
  name: string;
  badgeCount: number;
  isMe: boolean;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardCard({
  entries,
  groupName,
}: {
  entries: LeaderboardEntry[];
  groupName: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-border bg-surface p-5 shadow-elevated"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <span className="text-lg">🏆</span> لوحة الصدارة
        </h3>
        {groupName && <span className="text-xs text-ink-soft">{groupName}</span>}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-ink-soft py-4 text-center">لا يوجد زملاء في مجموعتك بعد.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                entry.isMe ? "bg-primary-soft border border-primary/20" : ""
              }`}
            >
              <span className="w-6 text-center shrink-0 stat-figure text-ink-soft">
                {MEDALS[i] ?? i + 1}
              </span>
              <span className={`flex-1 min-w-0 truncate ${entry.isMe ? "font-semibold text-primary" : "text-ink"}`}>
                {entry.name}
                {entry.isMe && <span className="text-xs text-ink-soft font-normal"> (أنت)</span>}
              </span>
              <span className="shrink-0 stat-figure text-xs text-ink-soft">🏅 {entry.badgeCount}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
