import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SESSION_COOKIE = "code_ai_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 ساعات

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET غير معرّف في متغيرات البيئة");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: "admin" | "student";
  /// موجود فقط لجلسات الطلاب - يُقارَن بـ currentSessionId في قاعدة
  /// البيانات لإبطال أي جهاز قديم فور تسجيل الدخول من جهاز جديد.
  sessionId?: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      (payload.role === "admin" || payload.role === "student")
    ) {
      return {
        userId: payload.userId,
        role: payload.role,
        sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** يُستخدم داخل Server Components / Route Handlers لإنشاء الكوكي بعد تسجيل الدخول. */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** يقرأ ويتحقق من جلسة المستخدم الحالي من داخل Server Component أو Route Handler. */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  // منع تسجيل دخول أكثر من جهاز واحد بنفس حساب الطالب في نفس الوقت: أي
  // جلسة طالب لازم يتطابق sessionId بتاعها مع آخر جلسة سُجّلت في قاعدة
  // البيانات (بتتغيّر مع كل عملية دخول جديدة). لو مش متطابقة، معناها إنه
  // سجّل دخول من جهاز تاني، فالجلسة القديمة دي بقت لاغية تلقائيًا.
  // هذا التحقق هنا فقط (نقطة مركزية واحدة) بدل تكراره في كل route، لأن
  // كل الصفحات والـ API الخاصة بالطالب بتمر من هنا أصلًا.
  if (session.role === "student") {
    const { db } = await import("./db");
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { currentSessionId: true },
    });
    if (!user || !session.sessionId || user.currentSessionId !== session.sessionId) {
      return null;
    }
  }

  return session;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/**
 * يُستخدم داخل Layouts محمية (admin/student) للتحقق الفعلي من قاعدة البيانات:
 * الـ middleware يتحقق فقط من صلاحية التوقيع، بينما هذه الدالة تتحقق أن الحساب
 * لا يزال status=active (مهم في حال تم تعطيل الحساب أثناء وجود جلسة نشطة).
 * تُستدعى فقط من Server Components، لذا يمكنها استخدام Prisma مباشرة.
 */
/** يُستخدم داخل Route Handlers للتحقق السريع من كون الطالب المسجّل دخوله أدمن. */
export async function requireAdminSession(): Promise<SessionPayload | null> {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function requireActiveUser(expectedRole: "admin" | "student") {
  const { db } = await import("./db");
  const session = await getCurrentSession();
  if (!session || session.role !== expectedRole) {
    return null;
  }
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "active" || user.role !== expectedRole) {
    return null;
  }
  return user;
}
