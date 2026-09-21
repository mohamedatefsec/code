import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

const subscribeSchema = z.object({
  endpoint: z
    .string()
    .max(1000)
    .url()
    .refine(isAllowedPushEndpoint, { message: "خدمة إشعارات غير مدعومة." }),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
  userAgent: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const student = await db.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات اشتراك غير صالحة." }, { status: 400 });
  }

  // upsert بالـ endpoint (فريد لكل جهاز/متصفح) - لو الطالب فعّل الإشعارات
  // قبل كده من نفس الجهاز، بنحدّث المفاتيح بدل ما نكرّر الصف.
  await db.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      studentId: student.id,
      endpoint: parsed.data.endpoint,
      keys: JSON.stringify(parsed.data.keys),
      userAgent: parsed.data.userAgent ?? null,
    },
    update: {
      studentId: student.id,
      keys: JSON.stringify(parsed.data.keys),
      userAgent: parsed.data.userAgent ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
