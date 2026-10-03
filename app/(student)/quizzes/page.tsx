import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { getStudentSubscriptionStatus } from "@/lib/subscription";
import { getContactWhatsappLink } from "@/lib/settings";
import { PaywallLock } from "@/components/PaywallLock";
import { QuizzesList } from "@/components/QuizzesList";

/// الاختبارات من محتوى المنهج زي الدروس وأسئلة المراجعة بالظبط - نفس القفل.
export default async function StudentQuizzesPage() {
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
            <h1 className="text-xl font-bold text-ink">الاختبارات</h1>
          </div>
          <PaywallLock paidUntil={subscription.paidUntil} whatsappLink={whatsappLink} />
        </div>
      );
    }
  }

  return <QuizzesList />;
}
