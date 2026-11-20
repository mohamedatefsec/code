"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ConfettiBurst } from "@/components/brand/ConfettiBurst";

/// زرار "خلّصت الدرس" في آخر صفحة الدرس. بيتحوّل لعلامة ✓ خضرا بعد الضغط،
/// ومعاها رابط للدرس اللي بعده (لو موجود). الطالب يقدر يرجع فيها.
export function LessonCompleteButton({
  lessonId,
  initialCompleted,
  nextLesson,
}: {
  lessonId: string;
  initialCompleted: boolean;
  nextLesson: { id: string; title: string } | null;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);
    setCompleted(next);
    const res = await fetch(`/api/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    }).catch(() => null);
    setSaving(false);
    if (res && res.ok && next) setCelebrate(Date.now());
    if (!res || !res.ok) {
      setCompleted(!next);
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "تعذّر الحفظ. اتأكد من الإنترنت وجرّب تاني.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
      <ConfettiBurst fireKey={celebrate} />
      <AnimatePresence mode="wait" initial={false}>
        {completed ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-wrap items-center gap-4"
          >
            <span className="grid place-items-center w-12 h-12 rounded-full bg-accent text-white shadow-glow">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="flex-1 min-w-[10rem]">
              <p className="font-bold text-ink">خلّصت الدرس ده 👏</p>
              <button
                onClick={() => toggle(false)}
                disabled={saving}
                className="text-xs text-ink-soft hover:text-ink underline mt-0.5 disabled:opacity-50"
              >
                لسه ما خلّصتوش؟ ارجع فيها
              </button>
            </div>
            {nextLesson && (
              <Link
                href={`/lessons/${nextLesson.id}`}
                className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow hover:brightness-110 transition"
              >
                الدرس اللي بعده
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="todo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex-1 min-w-[10rem]">
              <p className="font-bold text-ink">خلّصت الدرس؟</p>
              <p className="text-sm text-ink-soft mt-0.5">علّم عليه عشان تتابع تقدّمك في الوحدة.</p>
            </div>
            <button
              onClick={() => toggle(true)}
              disabled={saving}
              className="btn-shine rounded-xl bg-gradient-brand px-6 py-3 font-bold text-white shadow-glow hover:brightness-110 transition disabled:opacity-60"
            >
              ✓ خلّصت الدرس
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
