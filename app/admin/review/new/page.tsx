"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReviewQuestionForm,
  buildReviewPayload,
  type ReviewFormValue,
} from "@/components/ReviewQuestionForm";

export default function NewReviewQuestionPage() {
  const router = useRouter();

  async function handleSubmit(value: ReviewFormValue): Promise<string | null> {
    const res = await fetch("/api/review-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReviewPayload(value)),
    });

    if (res.ok) {
      router.push("/admin/review");
      router.refresh();
      return null;
    }
    const data = await res.json().catch(() => null);
    return data?.error ?? "تعذّر إنشاء السؤال.";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/review" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لأسئلة المراجعة
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">إضافة سؤال مراجعة</h1>
      </div>
      <ReviewQuestionForm onSubmit={handleSubmit} submitLabel="إنشاء السؤال" />
    </div>
  );
}
