import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

// حماية بسيطة من Brute Force: عدد محاولات محدود لكل IP خلال نافذة زمنية.
// (في الإنتاج يُفضّل استبدالها بـ Upstash Ratelimit أو ما شابه على مستوى Edge)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "محاولات كثيرة جدًا، حاول لاحقًا." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات الدخول غير صالحة." },
      { status: 400 }
    );
  }

  const { identifier, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { loginIdentifier: identifier },
  });

  // رسالة خطأ عامة وموحّدة سواء كان المستخدم غير موجود أو كلمة المرور خاطئة،
  // لمنع تسريب معلومة "هل هذا الحساب موجود؟" لمهاجم محتمل.
  const genericError = NextResponse.json(
    { error: "بيانات الدخول غير صحيحة." },
    { status: 401 }
  );

  if (!user) return genericError;

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) return genericError;

  if (user.status !== "active") {
    return NextResponse.json(
      { error: "هذا الحساب معطّل. يرجى التواصل مع المدرّس." },
      { status: 403 }
    );
  }

  // لجلسات الطلاب فقط: sessionId عشوائي جديد بيتخزّن كـ "الجلسة النشطة
  // الحالية" للحساب - أي جهاز قديم عنده sessionId مختلف هيتعامل معاه
  // getCurrentSession() كجلسة لاغية تلقائيًا (منع الدخول من أكثر من جهاز
  // بنفس حساب الطالب في نفس الوقت). الأدمن مش متأثر بالقيد ده.
  const sessionId = user.role === "student" ? crypto.randomUUID() : undefined;

  const token = await createSessionToken({ userId: user.id, role: user.role, sessionId });
  await setSessionCookie(token);

  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(sessionId ? { currentSessionId: sessionId } : {}),
    },
  });

  return NextResponse.json({
    role: user.role,
    redirectTo: user.role === "admin" ? "/admin/dashboard" : "/dashboard",
  });
}
