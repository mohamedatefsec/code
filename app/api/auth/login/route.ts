import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import {
  buildThrottleKeys,
  clearLoginFailures,
  clientIp,
  isLoginLocked,
  recordLoginFailure,
} from "@/lib/login-throttle";

// كلمة مرور Hash وهمية (cost 12 زي الحقيقية): بنقارن بيها لما الحساب مش موجود،
// عشان وقت الرد يكون واحد في الحالتين ومحدش يقدر يعرف "الحساب ده موجود؟" من
// سرعة الرد (Timing Attack).
const DUMMY_HASH = "$2b$12$KUdR66OyvJ2hvyPGlxBjEeJvDHSb0vSTAOaQ6yyIzbqLrkInF7hfi";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات الدخول غير صالحة." },
      { status: 400 }
    );
  }

  const { identifier, password } = parsed.data;

  // الحماية من التخمين: عدّاد محاولات فاشلة في قاعدة البيانات (lib/login-throttle.ts)
  const throttleKeys = buildThrottleKeys(identifier, clientIp(req.headers));
  if (await isLoginLocked(throttleKeys)) {
    return NextResponse.json(
      { error: "محاولات كثيرة جدًا، حاول بعد 10 دقايق." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const user = await db.user.findUnique({
    where: { loginIdentifier: identifier },
  });

  // رسالة خطأ عامة وموحّدة سواء كان المستخدم غير موجود أو كلمة المرور خاطئة،
  // لمنع تسريب معلومة "هل هذا الحساب موجود؟" لمهاجم محتمل.
  const genericError = NextResponse.json(
    { error: "بيانات الدخول غير صحيحة." },
    { status: 401 }
  );

  // بنعمل bcrypt compare دايمًا (حتى لو الحساب مش موجود) لتساوي زمن الرد
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    await recordLoginFailure(throttleKeys);
    return genericError;
  }

  if (user.status !== "active") {
    return NextResponse.json(
      { error: "هذا الحساب معطّل. يرجى التواصل مع المدرّس." },
      { status: 403 }
    );
  }

  await clearLoginFailures(throttleKeys);

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
