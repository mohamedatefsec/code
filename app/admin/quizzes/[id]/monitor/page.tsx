"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";

type LatestAttempt = {
  id: string;
  attemptNumber: number;
  status: "in_progress" | "submitted";
  startedAt: string;
  submittedAt: string | null;
  percentage: number | null;
  needsManualGrading: boolean;
};

type StudentRow = {
  id: string;
  fullName: string;
  studentCode: string;
  groupName: string | null;
  latestAttempt: LatestAttempt | null;
  attemptsUsed: number;
  extraGrants: number;
};

type MonitorData = {
  quiz: { id: string; title: string; durationMinutes: number; maxAttempts: number };
  students: StudentRow[];
};

function formatRemaining(startedAt: string, durationMinutes: number, now: number) {
  const deadline = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
  const secs = Math.round((deadline - now) / 1000);
  if (secs <= 0) return null; // انتهى الوقت
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const [data, setData] = useState<MonitorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [grantingId, setGrantingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/quizzes/${quizId}/monitor`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setData(d);
      });
  }, [quizId]);

  // تحديث تلقائي كل 10 ثوانٍ طالما المدرّس فاتح الصفحة، عشان يتابع الاختبار
  // وهو شغّال لحظيًا بلا حاجة لعمل Refresh يدوي.
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  // عدّاد محلي بس لتحديث "الوقت المتبقي" المعروض لكل طالب كل ثانية بين كل
  // تحديث وتاني من السيرفر.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  async function handleReopen(attemptId: string) {
    setReopeningId(attemptId);
    const res = await fetch(`/api/attempts/${attemptId}/reopen`, { method: "POST" });
    setReopeningId(null);
    if (res.ok) {
      load();
    } else {
      const d = await res.json().catch(() => null);
      alert(d?.error ?? "تعذّر فتح المحاولة من جديد.");
    }
  }

  async function handleGrantAttempt(studentId: string, studentName: string) {
    if (!confirm(`هل تريد منح "${studentName}" محاولة إضافية لهذا الاختبار؟ نتائجه السابقة ستبقى محفوظة كما هي.`)) {
      return;
    }
    setGrantingId(studentId);
    const res = await fetch(`/api/quizzes/${quizId}/grant-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setGrantingId(null);
    if (res.ok) {
      load();
    } else {
      const d = await res.json().catch(() => null);
      alert(d?.error ?? "تعذّر منح المحاولة الإضافية.");
    }
  }

  if (error) {
    return <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>;
  }
  if (!data) {
    return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/quizzes" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للاختبارات
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">متابعة: {data.quiz.title}</h1>
        <p className="text-sm text-ink-soft mt-1">
          مدة الاختبار {data.quiz.durationMinutes} دقيقة · الصفحة تتحدّث تلقائيًا كل 10 ثوانٍ.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden overflow-x-auto shadow-elevated">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-ink-soft">
            <tr>
              <th className="text-start px-4 py-3 font-medium">الطالب</th>
              <th className="text-start px-4 py-3 font-medium">المجموعة</th>
              <th className="text-start px-4 py-3 font-medium">الحالة</th>
              <th className="text-start px-4 py-3 font-medium">المحاولات</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                  لا يوجد طلاب مستهدَفون بهذا الاختبار.
                </td>
              </tr>
            )}
            {data.students.map((s) => {
              const attempt = s.latestAttempt;
              let statusNode: React.ReactNode;
              let showReopen = false;

              if (!attempt) {
                statusNode = <span className="text-ink-soft">لم يبدأ بعد</span>;
              } else if (attempt.status === "submitted") {
                statusNode = (
                  <span className="text-accent">
                    تم التسليم
                    {attempt.needsManualGrading
                      ? " · بانتظار تصحيح الأسئلة المقالية"
                      : attempt.percentage !== null
                      ? ` · ${attempt.percentage}%`
                      : ""}
                  </span>
                );
              } else {
                const remaining = formatRemaining(attempt.startedAt, data.quiz.durationMinutes, now);
                if (remaining) {
                  statusNode = (
                    <span className="text-primary stat-figure">قيد التنفيذ · متبقي {remaining}</span>
                  );
                } else {
                  statusNode = <span className="text-danger">انتهى الوقت ولم يُسلَّم بعد</span>;
                  showReopen = true;
                }
              }

              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{s.fullName}</p>
                    <p className="text-xs text-ink-soft">{s.studentCode}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{s.groupName ?? "—"}</td>
                  <td className="px-4 py-3">{statusNode}</td>
                  <td className="px-4 py-3 stat-figure text-ink-soft">
                    {s.attemptsUsed} / {data.quiz.maxAttempts + s.extraGrants}
                    {s.extraGrants > 0 && (
                      <span className="text-accent"> (+{s.extraGrants})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {showReopen && attempt && (
                        <button
                          onClick={() => handleReopen(attempt.id)}
                          disabled={reopeningId === attempt.id}
                          className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:opacity-90 transition disabled:opacity-50"
                        >
                          {reopeningId === attempt.id ? "جارٍ الفتح..." : "منح وقت جديد للدخول"}
                        </button>
                      )}
                      {attempt?.status === "submitted" && (
                        <button
                          onClick={() => handleGrantAttempt(s.id, s.fullName)}
                          disabled={grantingId === s.id}
                          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:opacity-90 transition disabled:opacity-50"
                        >
                          {grantingId === s.id ? "جارٍ المنح..." : "منح محاولة إضافية"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-soft">
        &quot;منح وقت جديد للدخول&quot; يعيد ضبط مؤقّت نفس المحاولة العالقة من جديد كاملة، ولا يُحتسب محاولة
        إضافية. &quot;منح محاولة إضافية&quot; يفتح للطالب فرصة إضافية بعد التسليم دون التأثير على نتيجته
        السابقة المحفوظة ولا على عدد المحاولات المسموح به لباقي الطلاب.
      </p>
    </div>
  );
}
