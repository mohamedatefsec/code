import { db } from "@/lib/db";

/// كل دوال التقدّم هنا "آمنة": لو حصل أي خطأ (مثلًا جدول lesson_progress
/// لسه ما اتعملش في قاعدة البيانات)، بترجّع قيمة فاضية بدل ما توقع الصفحة.
/// يعني الدروس نفسها بتفضل شغالة دايمًا، والتقدّم بس هو اللي بيختفي مؤقتًا.

export type LessonProgressState = "done" | "opened";

/// بيسجّل إن الطالب فتح الدرس (أول مرة بيعمل سجل، وبعدها بيحدّث آخر فتح).
export async function recordLessonOpen(studentId: string, lessonId: string): Promise<void> {
  try {
    await db.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      create: { studentId, lessonId },
      update: { lastOpenedAt: new Date(), openCount: { increment: 1 } },
    });
  } catch (err) {
    console.error("[lesson-progress] recordLessonOpen failed", err);
  }
}

/// حالة الطالب في درس واحد (للزرار في صفحة الدرس)
export async function getLessonCompleted(studentId: string, lessonId: string): Promise<boolean> {
  try {
    const row = await db.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
      select: { completedAt: true },
    });
    return Boolean(row?.completedAt);
  } catch {
    return false;
  }
}

/// حالة الطالب في كل الدروس اللي فتحها: lessonId → "done" (خلّصه) أو "opened" (فتحه بس)
export async function getStudentProgressMap(studentId: string): Promise<Map<string, LessonProgressState>> {
  try {
    const rows = await db.lessonProgress.findMany({
      where: { studentId },
      select: { lessonId: true, completedAt: true },
    });
    return new Map(rows.map((r) => [r.lessonId, r.completedAt ? "done" : "opened"]));
  } catch {
    return new Map();
  }
}

/// آخر درس الطالب فتحه وما خلّصهوش (لكارت "كمّل من حيث وقفت")
export async function getResumeLesson(studentId: string) {
  try {
    return await db.lessonProgress.findFirst({
      where: {
        studentId,
        completedAt: null,
        lesson: { status: "published", unit: { status: "published" } },
      },
      orderBy: { lastOpenedAt: "desc" },
      select: {
        lastOpenedAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            unit: { select: { title: true, subject: { select: { name: true, slug: true } } } },
          },
        },
      },
    });
  } catch {
    return null;
  }
}

/// عدد الدروس المنشورة اللي الطالب خلّصها
export async function getCompletedCount(studentId: string): Promise<number> {
  try {
    return await db.lessonProgress.count({
      where: {
        studentId,
        completedAt: { not: null },
        lesson: { status: "published", unit: { status: "published" } },
      },
    });
  } catch {
    return 0;
  }
}
