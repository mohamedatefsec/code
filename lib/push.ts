import webpush from "web-push";
import { db } from "@/lib/db";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /// رابط يفتح لما الطالب يضغط على الإشعار (مسار نسبي زي /dashboard)
  url?: string;
  icon?: string;
};

/// بيبعت إشعار push لمجموعة طلاب محدّدين (بكل الأجهزة/المتصفحات اللي
/// فعّلوا الإشعارات منها). فشل إرسال Push مش لازم يوقف أي عملية تانية
/// (نشر درس/اختبار) - فكل استدعاء هنا آمن ومحوّط بمعالجة أخطاء داخلية.
export async function sendPushToStudents(studentIds: string[], payload: PushPayload) {
  if (studentIds.length === 0) return;
  if (!ensureConfigured()) return; // مفاتيح VAPID لسه متضافتش - تجاهل بصمت

  const subscriptions = await db.pushSubscription.findMany({
    where: { studentId: { in: studentIds } },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      // اشتراكات قديمة اتسجّلت قبل قائمة السماح: نمسحها ومنبعتلهاش أبدًا
      if (!isAllowedPushEndpoint(sub.endpoint)) {
        staleIds.push(sub.id);
        return;
      }
      try {
        const keys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          body
        );
      } catch (err: unknown) {
        // 404/410 يعني الاشتراك انتهى أو الطالب سحب الإذن من متصفحه -
        // نمسحه من قاعدة البيانات عشان منفضلش نحاول نبعتله في المستقبل.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

/// بيبعت لكل الطلاب اللي عندهم اشتراك Push فعّال، بغض النظر عن المجموعة.
export async function sendPushToAllStudents(payload: PushPayload) {
  if (!ensureConfigured()) return;
  const subscriptions = await db.pushSubscription.findMany({ select: { studentId: true } });
  const studentIds = [...new Set(subscriptions.map((s) => s.studentId))];
  await sendPushToStudents(studentIds, payload);
}
