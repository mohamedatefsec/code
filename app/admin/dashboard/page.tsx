import { db } from "@/lib/db";
import { StatGrid } from "@/components/StatGrid";
import { DashboardHub } from "@/components/DashboardHub";

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
        <h1 className="text-xl font-bold text-ink">لوحة تحكم المنصة</h1>
        <p className="text-sm text-ink-soft mt-1">كل أقسام الإدارة في شاشة واحدة.</p>
      </div>

      <DashboardHub />

      <div>
        <h2 className="text-sm font-semibold text-ink-soft mb-3">نظرة عامة سريعة</h2>
        <div className="space-y-4">
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
        </div>
      </div>
    </div>
  );
}
