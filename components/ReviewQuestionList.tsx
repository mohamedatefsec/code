"use client";

import { useState } from "react";
import { ReviewQuestionCard } from "./ReviewQuestionCard";
import type { ReviewCardData } from "@/lib/review-shared";

/// قائمة أسئلة المراجعة للطالب + شريط تقدّم بيتحدّث لحظيًا أول ما الطالب يحل سؤال.
/// الترتيب (اللي لسه ما اتحلّش الأول) بيتحدد من السيرفر عند تحميل الصفحة، ومبنغيّرش
/// مكان البطاقة وقت الحل عشان الطالب يفضل شايف نتيجة سؤاله في نفس المكان.
export function ReviewQuestionList({ questions }: { questions: ReviewCardData[] }) {
  const [solvedIds, setSolvedIds] = useState<Set<string>>(
    () => new Set(questions.filter((q) => q.answer).map((q) => q.id))
  );

  const total = questions.length;
  const solved = solvedIds.size;
  const percent = total > 0 ? Math.round((solved / total) * 100) : 0;

  function handleSolved(id: string) {
    setSolvedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-elevated">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <p className="text-sm font-medium text-ink">
            {solved === total
              ? "🎉 خلّصت كل أسئلة المراجعة"
              : `حلّيت ${solved} من ${total} ${total === 1 ? "سؤال" : "أسئلة"}`}
          </p>
          <span className="stat-figure text-sm text-primary">{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-canvas overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-brand transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {questions.map((q, i) => (
        <ReviewQuestionCard key={q.id} question={q} index={i} onSolved={handleSolved} />
      ))}
    </div>
  );
}
