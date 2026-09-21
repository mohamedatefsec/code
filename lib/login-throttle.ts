import { db } from "@/lib/db";

/// حماية تسجيل الدخول من التخمين (Brute Force) - العدّاد محفوظ في قاعدة البيانات.
///
/// ليه مش في الذاكرة؟ على Vercel كل Serverless Function ليها ذاكرة منفصلة
/// بتتصفّر باستمرار، فعدّاد الذاكرة كان ممكن يتجاوزه أي مهاجم بسهولة.
///
/// وبنعدّ المحاولات الفاشلة فقط (مش كل الطلبات): سنتر فيه 30 طالب على نفس الواي
/// فاي (نفس الـ IP) بيسجّلوا دخول في نفس الدقيقة مايتقفلوش على بعض.
///
/// تلات مفاتيح بحدود مختلفة:
///  - pair    (الحساب + الـ IP): الأصغر - يوقف تخمين كلمة مرور حساب معيّن من جهاز واحد
///  - ip      (الـ IP فقط): أكبر - يوقف مهاجم بيجرّب حسابات كتير من نفس المصدر
///  - account (الحساب فقط): أكبر - يوقف التخمين الموزّع على IPs مختلفة
const WINDOW_MS = 10 * 60 * 1000;
const LIMITS = { pair: 8, ip: 60, account: 30 } as const;

export type ThrottleKeys = { pair: string; ip: string; account: string };

export function clientIp(headers: Headers): string {
  // أول عنوان في x-forwarded-for هو العميل الأصلي (Vercel بتكتبه هي بنفسها)
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || headers.get("x-real-ip")?.trim() || "unknown").slice(0, 64);
}

export function buildThrottleKeys(identifier: string, ip: string): ThrottleKeys {
  const id = identifier.trim().toLowerCase().slice(0, 100);
  return { pair: `pair:${id}|${ip}`, ip: `ip:${ip}`, account: `acct:${id}` };
}

/// كل العمليات هنا "fail-open": لو الجدول لسه ما اتعملش (قبل npm run db:push) أو
/// حصل خطأ في قاعدة البيانات، تسجيل الدخول نفسه يفضل شغّال بدل ما يقع.
export async function isLoginLocked(keys: ThrottleKeys): Promise<boolean> {
  try {
    const rows = await db.loginThrottle.findMany({
      where: {
        key: { in: [keys.pair, keys.ip, keys.account] },
        resetAt: { gt: new Date() },
      },
    });
    return rows.some(
      (r) =>
        (r.key === keys.pair && r.count >= LIMITS.pair) ||
        (r.key === keys.ip && r.count >= LIMITS.ip) ||
        (r.key === keys.account && r.count >= LIMITS.account)
    );
  } catch {
    return false;
  }
}

export async function recordLoginFailure(keys: ThrottleKeys): Promise<void> {
  try {
    const now = new Date();
    const resetAt = new Date(now.getTime() + WINDOW_MS);
    for (const key of [keys.pair, keys.ip, keys.account]) {
      const updated = await db.loginThrottle.updateMany({
        where: { key, resetAt: { gt: now } },
        data: { count: { increment: 1 } },
      });
      if (updated.count === 0) {
        // مفيش صف (أو انتهت نافذته): نبدأ نافذة جديدة
        await db.loginThrottle.upsert({
          where: { key },
          create: { key, count: 1, resetAt },
          update: { count: 1, resetAt },
        });
      }
    }
    // تنظيف عرضي للصفوف المنتهية (بدون cron)
    if (Math.random() < 0.05) {
      await db.loginThrottle.deleteMany({ where: { resetAt: { lt: now } } });
    }
  } catch {
    // تجاهل بهدوء
  }
}

/// دخول ناجح: نصفّر عدّاد (الحساب + الـ IP) بس.
export async function clearLoginFailures(keys: ThrottleKeys): Promise<void> {
  try {
    await db.loginThrottle.deleteMany({ where: { key: keys.pair } });
  } catch {
    // تجاهل بهدوء
  }
}
