import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, getCurrentSession } from "@/lib/auth";
import { lessonUpdateSchema } from "@/lib/validation";
import { notifyLessonPublished } from "@/lib/publish-notify";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: { media: { orderBy: { order: "asc" } }, unit: { include: { subject: true } } },
  });

  if (!lesson) {
    return NextResponse.json({ error: "الدرس غير موجود." }, { status: 404 });
  }
  if (session.role === "student" && (lesson.status !== "published" || lesson.unit.status !== "published")) {
    return NextResponse.json({ error: "الدرس غير متاح." }, { status: 403 });
  }

  return NextResponse.json({ lesson });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = lessonUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // نجيب حالة الدرس قبل التحديث عشان نكتشف لحظة "أول نشر" بالتحديد (draft
  // → published)، ونميّزها عن أي تعديل تاني عادي على درس منشور بالفعل.
  const before = await db.lesson.findUnique({
    where: { id },
    select: { status: true },
  });

  // الجدولة: publishAt بيتحوّل لتاريخ، ولو الدرس اتنشر يدوي دلوقتي بنلغي أي جدولة قديمة
  const { publishAt, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (publishAt !== undefined) data.publishAt = publishAt ? new Date(publishAt) : null;
  if (rest.status === "published") data.publishAt = null;

  const lesson = await db.lesson.update({
    where: { id },
    data,
    include: { unit: { include: { subject: true } } },
  });

  // عند أول نشر لدرس، نبعت إشعار تلقائي لكل الطلاب (داخلي + Push) عشان
  // يكون النشر "بارزًا وواضحًا" لهم فورًا، مش مجرد ظهور صامت في القائمة.
  const justPublished = before?.status !== "published" && lesson.status === "published";
  if (justPublished) {
    await notifyLessonPublished(lesson.id, session.userId);
  }

  return NextResponse.json({ lesson });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  await db.lesson.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
