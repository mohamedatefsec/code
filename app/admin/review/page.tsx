"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { REVIEW_TYPE_LABELS, type ReviewQuestionType } from "@/lib/review-shared";

type ReviewRow = {
  id: string;
  type: ReviewQuestionType;
  text: string;
  status: "draft" | "published";
  subjectName: string | null;
  answeredCount: number;
  correctCount: number;
  /// إجابات مقالية لسه بانتظار مراجعتك
  pendingCount: number;
};

export default function AdminReviewQuestionsPage() {
  const [questions, setQuestions] = useState<ReviewRow[] | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // إعادة التحميل بتتم بزيادة العدّاد (بدل استدعاء دالة تحدّث الـ state مباشرة
  // داخل الـ effect) - وكل setState هنا بيحصل داخل callback غير متزامن.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/review-questions")
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setError(null);
        setQuestions(data.questions);
        setTotalStudents(data.totalStudents);
      })
      .catch(() => {
        if (cancelled) return;
        setQuestions([]);
        setError("تعذّر تحميل الأسئلة. لو ده أول استخدام للميزة، اتأكد إنك شغّلت npm run db:push.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function toggleStatus(q: ReviewRow) {
    const nextStatus = q.status === "published" ? "draft" : "published";
    setTogglingId(q.id);
    const res = await fetch(`/api/review-questions/${q.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setTogglingId(null);
    if (res.ok) {
      setQuestions((prev) => prev?.map((x) => (x.id === q.id ? { ...x, status: nextStatus } : x)) ?? prev);
    }
  }

  async function handleDelete(q: ReviewRow) {
    const extra =
      q.answeredCount > 0
        ? `\nهيتمسح كمان إجابات ${q.answeredCount} طالب جاوبوا عليه.`
        : "";
    if (!confirm(`متأكد من حذف هذا السؤال؟${extra}`)) return;
    const res = await fetch(`/api/review-questions/${q.id}`, { method: "DELETE" });
    if (res.ok) reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">أسئلة المراجعة</h1>
          <p className="text-sm text-ink-soft mt-1 max-w-xl">
            أسئلة قصيرة بتظهر للطالب في صفحة &quot;المراجعة&quot;. الطالب بيجاوب مرة واحدة بس، وبعدها
            السؤال بيتقفل ويفضل ظاهر له بإجابته والإجابة الصحيحة.
          </p>
        </div>
        <Link
          href="/admin/review/new"
          className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
        >
          + إضافة سؤال
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden overflow-x-auto shadow-elevated">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-ink-soft">
            <tr>
              <th className="text-start px-4 py-3 font-medium">السؤال</th>
              <th className="text-start px-4 py-3 font-medium">النوع</th>
              <th className="text-start px-4 py-3 font-medium">المادة</th>
              <th className="text-start px-4 py-3 font-medium">الإجابات</th>
              <th className="text-start px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {questions === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {questions?.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  لسه مفيش أسئلة مراجعة. اضغط &quot;+ إضافة سؤال&quot; عشان تبدأ.
                </td>
              </tr>
            )}
            {questions?.map((q) => {
              // النسبة من الإجابات المصحّحة فقط (المقالي المعلّق مش داخل فيها)
              const gradedCount = q.answeredCount - q.pendingCount;
              const percent = gradedCount > 0 ? Math.round((q.correctCount / gradedCount) * 100) : null;
              return (
                <tr key={q.id} className="border-t border-border">
                  <td className="px-4 py-3 text-ink max-w-xs truncate">{q.text}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {REVIEW_TYPE_LABELS[q.type] ?? q.type}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{q.subjectName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    <span className="stat-figure text-primary">{q.answeredCount}</span>
                    {totalStudents > 0 && <span> / {totalStudents} طالب</span>}
                    {percent !== null && (
                      <span className="text-xs block">{percent}% إجاباتهم صحيحة</span>
                    )}
                    {q.pendingCount > 0 && (
                      <span className="text-xs block text-warn">
                        {q.pendingCount} بانتظار مراجعتك
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        q.status === "published"
                          ? "border border-accent/40 bg-accent/10 text-accent"
                          : "bg-canvas text-ink-soft"
                      }`}
                    >
                      {q.status === "published" ? "منشور" : "مسودة"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    <div className="flex items-center gap-3 justify-end text-sm">
                      <button
                        onClick={() => toggleStatus(q)}
                        disabled={togglingId === q.id}
                        className="text-accent hover:underline disabled:opacity-60"
                      >
                        {togglingId === q.id ? "..." : q.status === "published" ? "إرجاع لمسودة" : "نشر"}
                      </button>
                      <Link href={`/admin/review/${q.id}/edit`} className="text-primary hover:underline">
                        تعديل
                      </Link>
                      <button onClick={() => handleDelete(q)} className="text-danger hover:underline">
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
