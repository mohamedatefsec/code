import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { getStudentSubscriptionStatus } from "@/lib/subscription";
import { getContactWhatsappLink } from "@/lib/settings";
import { PaywallLock } from "@/components/PaywallLock";
import { QuizAttemptClient } from "@/components/QuizAttemptClient";

/// نفس قفل الاشتراك بتاع صفحة قائمة الاختبارات - بنطبّقه هنا كمان عشان
/// الطالب ميقدرش يكمّل محاولة اختبار بدأها قبل ما اشتراكه ينتهي عن طريق
/// رابط مباشر (bookmark) للمحاولة.
export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = await params;

  const user = await requireActiveUser("student");
  const profile = user
    ? await db.studentProfile.findUnique({ where: { userId: user.id } })
    : null;

  if (profile) {
    const subscription = await getStudentSubscriptionStatus(profile.id);
    if (!subscription.active) {
      const whatsappLink = await getContactWhatsappLink();
      return (
        <div className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-xl font-bold text-ink">الاختبار</h1>
          </div>
          <PaywallLock paidUntil={subscription.paidUntil} whatsappLink={whatsappLink} />
        </div>
      );
    }
  }

  return <QuizAttemptClient quizId={quizId} />;
}
