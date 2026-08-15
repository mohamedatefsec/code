"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuestionForm, QuestionFormValue } from "@/components/QuestionForm";

export default function NewQuestionPage() {
  const router = useRouter();

  async function handleSubmit(value: QuestionFormValue): Promise<string | null> {
    const res = await fetch("/api/questions", {
      method: "POST",
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
    return data?.error ?? "تعذّر إنشاء السؤال.";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/question-bank" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لبنك الأسئلة
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">إضافة سؤال جديد</h1>
      </div>
      <QuestionForm onSubmit={handleSubmit} submitLabel="إنشاء السؤال" />
    </div>
  );
}
