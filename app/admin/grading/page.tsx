"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PendingAttempt = {
  id: string;
  submittedAt: string;
  quiz: { title: string };
  student: { fullName: string; studentCode: string };
};

export default function GradingListPage() {
  const [attempts, setAttempts] = useState<PendingAttempt[] | null>(null);

  useEffect(() => {
    fetch("/api/grading/pending")
      .then((r) => r.json())
      .then((d) => setAttempts(d.attempts));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">التصحيح اليدوي</h1>
        <p className="text-sm text-ink-soft mt-1">محاولات فيها أسئلة مقالية بانتظار تصحيحك.</p>
      </div>

      {attempts === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {attempts?.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft shadow-elevated">
          لا توجد محاولات بانتظار التصحيح حاليًا. 🎉
        </div>
      )}

      <div className="space-y-3">
        {attempts?.map((a) => (
          <Link
            key={a.id}
            href={`/admin/grading/${a.id}`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-5 hover:border-primary transition shadow-elevated card-hover"
          >
            <div>
              <p className="font-medium text-ink">{a.quiz.title}</p>
              <p className="text-sm text-ink-soft mt-1">
                {a.student.fullName} ({a.student.studentCode})
              </p>
            </div>
            <span className="text-xs text-ink-soft">
              {new Date(a.submittedAt).toLocaleDateString("ar-EG")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
