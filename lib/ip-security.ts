import { db } from "@/lib/db";

export type LoginResult = "success" | "failed" | "blocked" | "disabled";

const LOG_RETENTION_DAYS = 90;

/// تسجيل عملية دخول (مع الـ IP) في سجل الدخول. "fail-open": لو الجدول لسه
/// ما اتعملش (قبل npm run db:push) أو حصل أي خطأ، تسجيل الدخول نفسه يفضل
/// شغّال - السجل مجرد أداة مراقبة مش شرط للدخول.
export async function recordLoginLog(entry: {
  userId?: string | null;
  identifier: string;
  ip: string;
  userAgent?: string | null;
  result: LoginResult;
}): Promise<void> {
  try {
    await db.loginLog.create({
      data: {
        userId: entry.userId ?? null,
        loginIdentifier: entry.identifier.trim().slice(0, 100),
        ip: entry.ip.slice(0, 64),
        userAgent: entry.userAgent ? entry.userAgent.slice(0, 255) : null,
        result: entry.result,
      },
    });
    // تنظيف عرضي للسجلات القديمة (بدون cron): بنحتفظ بآخر 90 يوم بس.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      await db.loginLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    }
  } catch {
    // تجاهل بهدوء
  }
}

/// هل الـ IP ده محظور من دخول الطلاب؟ "fail-open" برضو: أي خطأ = مش محظور.
/// الـ IP المجهول ("unknown") عمره ما بيتحظر عشان مانقفلش على الكل بالغلط.
export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  try {
    const row = await db.blockedIp.findUnique({ where: { ip }, select: { id: true } });
    return row !== null;
  } catch {
    return false;
  }
}
