"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Quiz = {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  durationMinutes: number;
  subject: { name: string };
  _count: { questions: number; attempts: number };
};

const STATUS_LABELS: Record<Quiz["status"], string> = {
  draft: "مسودة",
  published: "منشور",
  closed: "مغلق",
};

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);

  function load() {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    if (!confirm("متأكد من حذف هذا الاختبار؟ كل محاولات الطلاب المرتبطة به هتتحذف كمان.")) return;
    const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">الاختبارات</h1>
          <p className="text-sm text-ink-soft mt-1">إنشاء وإدارة اختبارات الطلاب.</p>
        </div>
        <Link
          href="/admin/quizzes/new"
          className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
        >
          + إنشاء اختبار
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden overflow-x-auto shadow-elevated">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-ink-soft">
            <tr>
              <th className="text-start px-4 py-3 font-medium">العنوان</th>
              <th className="text-start px-4 py-3 font-medium">المادة</th>
              <th className="text-start px-4 py-3 font-medium">الأسئلة</th>
              <th className="text-start px-4 py-3 font-medium">المحاولات</th>
              <th className="text-start px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {quizzes === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {quizzes?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  لا توجد اختبارات بعد.
                </td>
              </tr>
            )}
            {quizzes?.map((q) => (
              <tr key={q.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/admin/quizzes/${q.id}/builder`} className="font-medium text-ink hover:text-primary">
                    {q.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{q.subject.name}</td>
                <td className="px-4 py-3 stat-figure text-primary">{q._count.questions}</td>
                <td className="px-4 py-3 stat-figure text-ink-soft">{q._count.attempts}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      q.status === "published"
                        ? "border border-accent/40 bg-accent/10 text-accent"
                        : q.status === "closed"
                        ? "border border-danger/40 bg-danger/10 text-danger"
                        : "bg-canvas text-ink-soft"
                    }`}
                  >
                    {STATUS_LABELS[q.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-end">
                  <button onClick={() => handleDelete(q.id)} className="text-danger hover:underline text-sm">
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
