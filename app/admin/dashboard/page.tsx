import { db } from "@/lib/db";
import { StatGrid } from "@/components/StatGrid";

export default async function AdminDashboardPage() {
  const [
    totalStudents,
    activeStudents,
    totalGroups,
    publishedLessons,
    totalQuestions,
    publishedQuizzes,
    totalAttempts,
    totalSessions,
    totalNotifications,
    totalBadgesAwarded,
  ] = await Promise.all([
    db.studentProfile.count(),
    db.studentProfile.count({ where: { user: { status: "active" } } }),
    db.group.count(),
    db.lesson.count({ where: { status: "published" } }),
    db.question.count(),
    db.quiz.count({ where: { status: "published" } }),
    db.quizAttempt.count({ where: { status: "submitted" } }),
    db.attendanceSession.count(),
    db.notification.count(),
    db.studentBadge.count(),
  ]);

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-ink">لوحة التحكم</h1>
        <p className="text-sm text-ink-soft mt-1">نظرة عامة على المنصة.</p>
      </div>

      <StatGrid
        stats={[
          { label: "إجمالي الطلاب", value: totalStudents },
          { label: "الطلاب النشطون", value: activeStudents, accent: "accent" },
          { label: "المجموعات", value: totalGroups },
          { label: "الدروس المنشورة", value: publishedLessons, accent: "accent" },
        ]}
      />
      <StatGrid
        stats={[
          { label: "إجمالي الأسئلة", value: totalQuestions },
          { label: "اختبارات منشورة", value: publishedQuizzes, accent: "accent" },
          { label: "محاولات مُسلَّمة", value: totalAttempts },
          { label: "حصص حضور مُسجَّلة", value: totalSessions, accent: "accent" },
        ]}
      />
      <StatGrid
        stats={[
          { label: "إشعارات مُرسَلة", value: totalNotifications },
          { label: "شارات مُمنوحة", value: totalBadgesAwarded, accent: "accent" },
        ]}
      />

      <div className="rounded-xl border border-border bg-surface p-6 animate-fade-in-up shadow-elevated" style={{ animationDelay: "0.3s" }}>
        <h2 className="font-semibold text-gradient-brand mb-2">Phase 1 → 8 مكتملة ✅</h2>
        <p className="text-sm text-ink-soft leading-6">
          التأسيس، إدارة الطلاب والمجموعات، المحتوى التعليمي، بنك الأسئلة
          (بما فيها المقالي)، الاختبارات، الحضور والغياب، الإشعارات والتحفيز،
          ومولّد الأسئلة بالذكاء الاصطناعي — كل المراحل الأساسية جاهزة.
        </p>
      </div>
    </div>
  );
}
