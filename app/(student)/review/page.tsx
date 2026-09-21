import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toStudentReviewCard } from "@/lib/review";
import type { ReviewCardData } from "@/lib/review-shared";
import { ReviewQuestionList } from "@/components/ReviewQuestionList";

export default async function StudentReviewPage() {
  const user = await requireActiveUser("student");
  const profile = user
    ? await db.studentProfile.findUnique({ where: { userId: user.id } })
    : null;

  const rows = profile
    ? await db.reviewQuestion.findMany({
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        include: {
          subject: { select: { name: true } },
          options: true,
          // إجابة هذا الطالب فقط (لو موجودة) - مش إجابات باقي الطلاب
          answers: { where: { studentId: profile.id } },
        },
      })
    : [];

  // الأسئلة اللي لسه ما اتحلّتش الأول (الأحدث فالأقدم)، وبعدها اللي اتحلّت.
  // toStudentReviewCard هي اللي بتشيل الإجابات الصحيحة والشرح من أي سؤال لسه
  // ما اتحلّش، فمفيش أي حاجة بتتسرّب لمتصفح الطالب قبل ما يجاوب.
  const cards = rows
    .map((q) => toStudentReviewCard(q, q.answers[0] ?? null))
    .filter((c): c is ReviewCardData => c !== null);
  const ordered = [...cards.filter((c) => !c.answer), ...cards.filter((c) => c.answer)];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">أسئلة المراجعة</h1>
        <p className="text-sm text-ink-soft mt-1">
          جاوب على كل سؤال مرة واحدة. بعد ما تأكّد إجابتك السؤال بيتقفل، وتقدر ترجع تشوفه
          وتراجع الإجابة الصحيحة والشرح في أي وقت.
        </p>
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft shadow-elevated">
          لا توجد أسئلة مراجعة حاليًا. راجع لاحقًا.
        </div>
      ) : (
        <ReviewQuestionList questions={ordered} />
      )}
    </div>
  );
}
