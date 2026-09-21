"use client";

import { Fragment, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReviewQuestionForm,
  buildReviewPayload,
  type ReviewFormValue,
} from "@/components/ReviewQuestionForm";

type AnswerRow = {
  studentId: string;
  fullName: string;
  studentCode: string;
  /// null = سؤال مقالي بانتظار مراجعتك
  isCorrect: boolean | null;
  textAnswer: string | null;
  answeredAt: string;
};

export default function EditReviewQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [initialValue, setInitialValue] = useState<Partial<ReviewFormValue> | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // إعادة تحميل قائمة الإجابات بتتم بزيادة العدّاد، وكل setState داخل callback غير متزامن.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/review-questions/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((d) => {
        if (cancelled) return;
        const q = d.question;
        setAnswers(d.answers);
        // بعد "إعادة فتح" إجابات، بنحدّث قائمة الإجابات بس - مش بنعيد تحميل الفورم
        // (عشان ما نضيّعش على الأدمن أي تعديل لسه ما اتحفظش).
        setInitialValue(
          (prev) =>
            prev ?? {
              type: q.type,
              subjectId: q.subjectId ?? "",
              text: q.text,
              codeSnippet: q.codeSnippet ?? "",
              explanation: q.explanation ?? "",
              status: q.status,
              options: q.options.map((o: { id: string; text: string; isCorrect: boolean }) => ({
                id: o.id,
                text: o.text,
                isCorrect: o.isCorrect,
              })),
            }
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError("السؤال غير موجود أو تعذّر تحميله.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleSubmit(value: ReviewFormValue): Promise<string | null> {
    const res = await fetch(`/api/review-questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReviewPayload(value)),
    });

    if (res.ok) {
      router.push("/admin/review");
      router.refresh();
      return null;
    }
    const data = await res.json().catch(() => null);
    return data?.error ?? "تعذّر حفظ التعديلات.";
  }

  /// مراجعة يدوية لإجابة طالب على سؤال مقالي
  async function gradeEssay(studentId: string, isCorrect: boolean | null) {
    setBusy(true);
    await fetch(`/api/review-questions/${id}/answers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, isCorrect }),
    });
    setBusy(false);
    setReloadKey((k) => k + 1);
  }

  async function reopen(studentId: string | null) {
    const msg = studentId
      ? "هيتمسح جواب الطالب ده ويقدر يجاوب على السؤال من جديد. تكمل؟"
      : `هيتمسح جواب كل الطلاب (${answers.length}) ويقدروا يجاوبوا من جديد. تكمل؟`;
    if (!confirm(msg)) return;
    setBusy(true);
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    await fetch(`/api/review-questions/${id}/answers${qs}`, { method: "DELETE" });
    setBusy(false);
    setReloadKey((k) => k + 1);
  }

  const hasAnswers = answers.length > 0;
  const isEssayQuestion = initialValue?.type === "essay";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/review" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لأسئلة المراجعة
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">تعديل سؤال المراجعة</h1>
      </div>

      {loadError && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {loadError}
        </div>
      )}

      {initialValue ? (
        <ReviewQuestionForm
          initialValue={initialValue}
          onSubmit={handleSubmit}
          submitLabel="حفظ التعديلات"
          lockType={hasAnswers}
          notice={
            hasAnswers
              ? `فيه ${answers.length} طالب جاوبوا على السؤال ده. لو عدّلت الخيارات أو الإجابة الصحيحة، هيتعاد تصحيح إجاباتهم تلقائيًا.`
              : null
          }
        />
      ) : (
        !loadError && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>
      )}

      {initialValue && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-ink">
              إجابات الطلاب <span className="stat-figure text-primary">({answers.length})</span>
            </h2>
            {hasAnswers && (
              <button
                type="button"
                onClick={() => reopen(null)}
                disabled={busy}
                className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 transition-all disabled:opacity-60"
              >
                مسح كل الإجابات (إعادة فتح للجميع)
              </button>
            )}
          </div>

          {!hasAnswers ? (
            <p className="text-sm text-ink-soft">لسه مفيش طالب جاوب على السؤال ده.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="text-start py-2 font-medium">الطالب</th>
                    <th className="text-start py-2 font-medium">الكود</th>
                    <th className="text-start py-2 font-medium">النتيجة</th>
                    <th className="text-start py-2 font-medium">التاريخ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {answers.map((a) => (
                    <Fragment key={a.studentId}>
                    <tr className="border-t border-border">
                      <td className="py-2.5 text-ink">{a.fullName}</td>
                      <td className="py-2.5 text-ink-soft stat-figure">{a.studentCode}</td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            a.isCorrect === null
                              ? "border border-warn/40 bg-warn-soft text-warn"
                              : a.isCorrect
                              ? "border border-accent/40 bg-accent/10 text-accent"
                              : "border border-danger/40 bg-danger/10 text-danger"
                          }`}
                        >
                          {a.isCorrect === null ? "بانتظار المراجعة" : a.isCorrect ? "صح" : "خطأ"}
                        </span>
                      </td>
                      <td className="py-2.5 text-ink-soft whitespace-nowrap">
                        {new Date(a.answeredAt).toLocaleDateString("ar-EG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-2.5 text-end">
                        <button
                          type="button"
                          onClick={() => reopen(a.studentId)}
                          disabled={busy}
                          className="text-primary hover:underline text-xs disabled:opacity-60"
                        >
                          إعادة فتح
                        </button>
                      </td>
                    </tr>
                    {isEssayQuestion && (
                      <tr>
                        <td colSpan={5} className="pb-3">
                          <div className="rounded-lg border border-border bg-canvas px-4 py-3 text-sm leading-7 text-ink whitespace-pre-wrap break-words">
                            {a.textAnswer}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => gradeEssay(a.studentId, true)}
                              className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 font-semibold text-accent hover:bg-accent/20 disabled:opacity-60"
                            >
                              ✅ صحيحة
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => gradeEssay(a.studentId, false)}
                              className="rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1 font-semibold text-danger hover:bg-danger/20 disabled:opacity-60"
                            >
                              ❌ غير صحيحة
                            </button>
                            {a.isCorrect !== null && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => gradeEssay(a.studentId, null)}
                                className="text-ink-soft hover:underline disabled:opacity-60"
                              >
                                رجّعها للمراجعة
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
