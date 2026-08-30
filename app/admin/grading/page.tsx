"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PendingAttempt = {
  id: string;
  submittedAt: string;
  quiz: { title: string };
  student: { fullName: string; studentCode: string };
};

function GradingRowSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-5 flex items-center justify-between shadow-elevated animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      <div className="skeleton h-3 w-16 rounded" />
    </div>
  );
}

export default function GradingListPage() {
  const [attempts, setAttempts] = useState<PendingAttempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setAttempts(null);
    fetch("/api/grading/pending")
      .then(async (r) => {
        // لو الرد مش 200 (مثلًا 403 أو 500)، الجسم برضه ممكن يكون JSON
        // فيه رسالة خطأ - نحاول نقرأها، ولو فشل حتى ده نرجع رسالة عامة.
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error ?? `تعذّر تحميل قائمة التصحيح (كود ${r.status}).`);
        }
        return r.json();
      })
      .then((d) => setAttempts(d.attempts ?? []))
      .catch((err: Error) => {
        // من غير الـ catch دي، أي فشل هنا كان بيسيب الصفحة عالقة على
        // "جارٍ التحميل..." للأبد من غير أي رسالة توضّح إيه اللي حصل.
        setError(err.message || "تعذّر تحميل قائمة التصحيح. تأكد من اتصالك وحاول تاني.");
      });
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">التصحيح اليدوي</h1>
        <p className="text-sm text-ink-soft mt-1">محاولات فيها أسئلة مقالية بانتظار تصحيحك.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-5 shadow-elevated animate-fade-in-up">
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={load}
            className="mt-3 rounded-lg border border-danger/40 bg-white px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/5 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {!error && attempts === null && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <GradingRowSkeleton key={i} delay={i * 0.06} />
          ))}
        </div>
      )}

      {!error && attempts?.length === 0 && (
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
