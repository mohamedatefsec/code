import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuizPrintView } from "@/components/QuizPrintView";

export default async function QuizPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // صفحة الطباعة دي خارج تخطيط /admin عمدًا (بدون AdminShell) عشان
  // تطلع نظيفة تمامًا عند الطباعة - من غير الشريط الجانبي والهيدر. بنعمل
  // نفس فحص الصلاحية اللي بيعمله app/admin/layout.tsx يدويًا هنا.
  const user = await requireActiveUser("admin");
  if (!user) redirect("/login");

  const { id } = await params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    select: {
      title: true,
      durationMinutes: true,
      maxAttempts: true,
      subject: { select: { name: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          pointsOverride: true,
          question: {
            select: {
              id: true,
              text: true,
              type: true,
              codeSnippet: true,
              difficulty: true,
              points: true,
              lesson: { select: { title: true } },
              options: { orderBy: { order: "asc" }, select: { id: true, text: true, isCorrect: true } },
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    return (
      <div className="p-8 text-center text-sm text-ink-soft">الاختبار غير موجود.</div>
    );
  }

  return <QuizPrintView quiz={quiz} />;
}
