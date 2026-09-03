"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playAchievementChime } from "@/lib/sound";

export type EarnedBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const CONFETTI_COLORS = ["var(--color-primary)", "var(--color-accent)", "#f59e0b", "#f472b6"];

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 70 + Math.random() * 50;
        return {
          id: i,
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
          rot: `${(Math.random() - 0.5) * 400}deg`,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: Math.random() * 0.1,
        };
      }),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-1/2 start-1/2 w-2 h-2 rounded-sm"
          style={{
            background: p.color,
            ["--tx" as string]: p.tx,
            ["--ty" as string]: p.ty,
            ["--rot" as string]: p.rot,
            animation: `confettiBurst 0.9s ease-out ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}

/// مكوّن احتفال بشارة مُكتسَبة حديثًا: صوت + حركة (توهج ونبض ومؤثر كونفيتي).
/// عشان منحتاجش نضيف عمود جديد في قاعدة البيانات لتتبّع "الشارات اللي
/// الطالب شافها بالفعل"، بنحتفظ بقائمة معرّفات الشارات المشاهَدة في
/// localStorage الخاص بالمتصفح (مفتاح مربوط بمعرّف الطالب). أي شارة في
/// earnedBadges مش موجودة في القائمة دي = "جديدة" فنحتفل بيها، وبعدين
/// نضيفها للقائمة عشان متتكررش المرة الجاية.
export function BadgeCelebration({
  studentId,
  earnedBadges,
}: {
  studentId: string;
  earnedBadges: EarnedBadge[];
}) {
  const [queue, setQueue] = useState<EarnedBadge[]>([]);

  useEffect(() => {
    if (earnedBadges.length === 0) return;
    const storageKey = `seenBadges:${studentId}`;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch {
      seen = [];
    }
    const seenSet = new Set(seen);
    const newOnes = earnedBadges.filter((b) => !seenSet.has(b.id));

    if (newOnes.length > 0) {
      setQueue(newOnes);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...seen, ...newOnes.map((b) => b.id)]));
      } catch {
        // localStorage مش متاح (وضع تصفح خاص مثلًا) - نتجاهل بهدوء، الاحتفال
        // هيتكرر في الزيارة الجاية وده مقبول كحد أقصى للأثر الجانبي.
      }
    }
    // نستخدم earnedBadges.length + studentId فقط كاعتماديات - القيمة الفعلية
    // بتتغيّر مع كل تحميل صفحة سيرفر جديد على أي حال.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, earnedBadges.length]);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (current) playAchievementChime();
  }, [current]);

  function dismiss() {
    setQueue((q) => q.slice(1));
  }

  return (
    <AnimatePresence>
      {current && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.55 }}
            className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-7 text-center shadow-elevated overflow-hidden"
          >
            <div
              className="absolute -top-12 -end-12 w-40 h-40 rounded-full opacity-20 blur-2xl"
              style={{ background: "var(--gradient-brand)" }}
              aria-hidden="true"
            />
            <div className="relative">
              <p className="text-xs font-semibold text-accent tracking-wide">🎉 إنجاز جديد!</p>
              <div className="relative mt-4 mx-auto w-24 h-24 grid place-items-center">
                <ConfettiBurst />
                <motion.span
                  className="relative text-5xl grid place-items-center w-24 h-24 rounded-full bg-gradient-brand shadow-glow"
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.1, repeat: 2, ease: "easeInOut" }}
                >
                  {current.icon}
                </motion.span>
              </div>
              <h3 className="mt-4 font-bold text-lg text-ink">{current.name}</h3>
              <p className="text-sm text-ink-soft mt-1.5">{current.description}</p>
              <button
                onClick={dismiss}
                className="mt-6 w-full rounded-full bg-gradient-brand text-white px-5 py-2.5 text-sm font-semibold shadow-glow hover:opacity-90 active:scale-[0.98] transition"
              >
                رائع! متابعة
              </button>
              {queue.length > 1 && (
                <p className="text-xs text-ink-soft mt-3">+{queue.length - 1} شارة أخرى بانتظارك</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
