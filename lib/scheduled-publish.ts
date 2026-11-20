import { after, connection } from "next/server";
import { db } from "@/lib/db";
import { notifyLessonPublished, notifyQuizPublished } from "@/lib/publish-notify";

/// النشر المجدول: أي درس أو اختبار "مسودة" ميعاد نشره (publishAt) جه، بيتنشر
/// أول ما أي طالب أو أدمن يفتح المنصة. (خطة Vercel المجانية مافيهاش تشغيل
/// تلقائي كل دقيقة، فبنستغل فتح الصفحات بدل كده.)
///
/// - التحويل لـ "منشور" بيحصل فورًا (سريع) عشان اللي فتح الصفحة يشوف المحتوى.
/// - الإشعارات بتتبعت في الخلفية بعد ما الصفحة توصل (after) عشان ماتبطّأهاش.
/// - مفيش تكرار: كل عنصر بيتنشر بـ updateMany بشرط إنه لسه مسودة، فلو طالبين
///   فتحوا في نفس اللحظة، واحد بس اللي بيكسب ويبعت الإشعار.
/// - أي خطأ (مثلًا عمود publish_at لسه مش موجود) بيتجاهل بهدوء.

const CHECK_EVERY_MS = 30_000;
let lastCheck = 0;

export async function publishDueContent(): Promise<void> {
  // بيستنى طلب حقيقي من زائر: عمره ما يشتغل وقت بناء المنصة على Vercel
  await connection();
  const nowMs = Date.now();
  if (nowMs - lastCheck < CHECK_EVERY_MS) return;
  lastCheck = nowMs;
  const now = new Date(nowMs);

  try {
    const [dueLessons, dueQuizzes] = await Promise.all([
      db.lesson.findMany({ where: { status: "draft", publishAt: { lte: now } }, select: { id: true } }),
      db.quiz.findMany({
        where: { status: "draft", publishAt: { lte: now } },
        select: { id: true, _count: { select: { questions: true } } },
      }),
    ]);
    if (dueLessons.length === 0 && dueQuizzes.length === 0) return;

    const publishedLessons: string[] = [];
    for (const l of dueLessons) {
      const res = await db.lesson.updateMany({
        where: { id: l.id, status: "draft", publishAt: { lte: now } },
        data: { status: "published", publishAt: null },
      });
      if (res.count === 1) publishedLessons.push(l.id);
    }

    const publishedQuizzes: string[] = [];
    for (const q of dueQuizzes) {
      if (q._count.questions === 0) {
        // اختبار من غير أسئلة مايتنشرش - بنلغي الجدولة ويفضل مسودة
        await db.quiz.updateMany({ where: { id: q.id, status: "draft" }, data: { publishAt: null } });
        continue;
      }
      const res = await db.quiz.updateMany({
        where: { id: q.id, status: "draft", publishAt: { lte: now } },
        data: { status: "published", publishAt: null },
      });
      if (res.count === 1) publishedQuizzes.push(q.id);
    }

    if (publishedLessons.length === 0 && publishedQuizzes.length === 0) return;

    // الإشعار محتاج "مين اللي نشر" - بنستخدم أول حساب أدمن
    const admin = await db.user.findFirst({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const createdBy = admin?.id ?? "system";

    after(async () => {
      for (const id of publishedLessons) await notifyLessonPublished(id, createdBy);
      for (const id of publishedQuizzes) await notifyQuizPublished(id, createdBy);
    });
  } catch (err) {
    console.error("[scheduled-publish] failed", err);
  }
}
