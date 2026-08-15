"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuestionForm, QuestionFormValue } from "@/components/QuestionForm";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [initialValue, setInitialValue] = useState<Partial<QuestionFormValue> | null>(null);

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const q = d.question;
        setInitialValue({
          subjectId: q.subjectId,
          unitId: q.unitId ?? "",
          lessonId: q.lessonId ?? "",
          type: q.type,
          text: q.text,
          codeSnippet: q.codeSnippet ?? "",
          difficulty: q.difficulty,
          points: q.points,
          explanation: q.explanation ?? "",
          status: q.status,
          options: q.options.map((o: { text: string; isCorrect: boolean }) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        });
      });
  }, [id]);

  async function handleSubmit(value: QuestionFormValue): Promise<string | null> {
    const res = await fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: value.subjectId,
        unitId: value.unitId || null,
        lessonId: value.lessonId || null,
        type: value.type,
        text: value.text,
        codeSnippet: value.type === "code_output" ? value.codeSnippet || null : null,
        difficulty: value.difficulty,
        points: value.points,
        explanation: value.explanation || null,
        status: value.status,
        options: value.options,
      }),
    });

    if (res.ok) {
      router.push("/admin/question-bank");
      router.refresh();
      return null;
    }
    const data = await res.json().catch(() => null);
    return data?.error ?? "تعذّر حفظ التعديلات.";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/question-bank" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لبنك الأسئلة
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">تعديل السؤال</h1>
      </div>
      {initialValue ? (
        <QuestionForm initialValue={initialValue} onSubmit={handleSubmit} submitLabel="حفظ التعديلات" />
      ) : (
        <p className="text-sm text-ink-soft">جارٍ التحميل...</p>
      )}
    </div>
  );
}
