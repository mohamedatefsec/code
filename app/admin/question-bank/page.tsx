"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Question = {
  id: string;
  text: string;
  type: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  status: "draft" | "published";
  subject: { name: string };
  unit: { title: string } | null;
  _count: { options: number };
};

const TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح/خطأ",
  multiple_answer: "اختيارات متعددة",
  ordering: "ترتيب",
  code_output: "ناتج كود",
  essay: "مقالي",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/questions?${params.toString()}`);
    const data = await res.json();
    setQuestions(data.questions);
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("متأكد من حذف هذا السؤال؟")) return;
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">بنك الأسئلة</h1>
          <p className="text-sm text-ink-soft mt-1">إدارة أسئلة كل المواد والوحدات.</p>
        </div>
        <Link
          href="/admin/question-bank/new"
          className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
        >
          + إضافة سؤال
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في نص السؤال..."
          className="flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="published">منشور</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden overflow-x-auto shadow-elevated">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-ink-soft">
            <tr>
              <th className="text-start px-4 py-3 font-medium">السؤال</th>
              <th className="text-start px-4 py-3 font-medium">النوع</th>
              <th className="text-start px-4 py-3 font-medium">المادة</th>
              <th className="text-start px-4 py-3 font-medium">الصعوبة</th>
              <th className="text-start px-4 py-3 font-medium">الدرجة</th>
              <th className="text-start px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {questions === null && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-soft">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {questions?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-soft">
                  لا توجد أسئلة مطابقة.
                </td>
              </tr>
            )}
            {questions?.map((q) => (
              <tr key={q.id} className="border-t border-border">
                <td className="px-4 py-3 text-ink max-w-xs truncate">{q.text}</td>
                <td className="px-4 py-3 text-ink-soft">{TYPE_LABELS[q.type]}</td>
                <td className="px-4 py-3 text-ink-soft">{q.subject.name}</td>
                <td className="px-4 py-3 text-ink-soft">{DIFFICULTY_LABELS[q.difficulty]}</td>
                <td className="px-4 py-3 stat-figure text-primary">{q.points}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      q.status === "published" ? "border border-accent/40 bg-accent/10 text-accent" : "bg-canvas text-ink-soft"
                    }`}
                  >
                    {q.status === "published" ? "منشور" : "مسودة"}
                  </span>
                </td>
                <td className="px-4 py-3 text-end whitespace-nowrap">
                  <div className="flex items-center gap-3 justify-end text-sm">
                    <Link href={`/admin/question-bank/${q.id}/edit`} className="text-primary hover:underline">
                      تعديل
                    </Link>
                    <button onClick={() => handleDelete(q.id)} className="text-danger hover:underline">
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
