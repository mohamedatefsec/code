import webpush from "web-push";
import { db } from "@/lib/db";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    // بنطبع مين الناقص بالظبط + أسماء متغيرات VAPID اللي السيرفر شايفها (أسماء بس،
    // من غير أي قيمة). JSON.stringify بيكشف أي مسافة زيادة أو غلطة كتابة في الاسم.
    console.error("[push] مفاتيح VAPID ناقصة - الإشعارات متوقفة.", {
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
      vercelEnv: process.env.VERCEL_ENV,
      vapidLikeNames: Object.keys(process.env)
        .filter((k) => /vapid|pavid/i.test(k))
        .map((k) => JSON.stringify(k)),
    });
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    // مثلًا: VAPID_SUBJECT من غير mailto: أو مفتاح بصيغة غلط. لازم نعرف السبب من اللوج.
    console.error("[push] إعداد VAPID غير صالح:", (err as Error).message);
    return false;
  }
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
  let sent = 0;
  let failed = 0;

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
        sent++;
      } catch (err: unknown) {
        failed++;
        // بنسجّل سبب الفشل في لوج Vercel (الـ host بس، من غير الـ endpoint الكامل)
        // عشان أي مشكلة (مفاتيح غير متطابقة 403، اشتراك منتهي 410...) تبان.
        const e = err as { statusCode?: number; body?: string; message?: string };
        let host = "?";
        try {
          host = new URL(sub.endpoint).host;
        } catch {}
        console.error("[push] فشل الإرسال", {
          host,
          statusCode: e?.statusCode,
          body: typeof e?.body === "string" ? e.body.slice(0, 200) : undefined,
          message: e?.message,
        });
        // 404/410 يعني الاشتراك انتهى أو الطالب سحب الإذن من متصفحه -
        // نمسحه من قاعدة البيانات عشان منفضلش نحاول نبعتله في المستقبل.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  console.log(`[push] تم الإرسال: ${sent} نجح، ${failed} فشل (من ${subscriptions.length} اشتراك)`);

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
