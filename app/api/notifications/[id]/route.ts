import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { notificationCreateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "الإشعار غير موجود." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = notificationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await db.notification.update({
    where: { id },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      targetType: parsed.data.targetType,
      targetGroupId: parsed.data.targetType === "group" ? parsed.data.targetGroupId : null,
      targetStudentId: parsed.data.targetType === "student" ? parsed.data.targetStudentId : null,
    },
  });

  return NextResponse.json({ notification: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "الإشعار غير موجود." }, { status: 404 });
  }

  // onDelete: Cascade على NotificationRead في الـ schema، فسجلات القراءة
  // المرتبطة بيه بتتشال تلقائيًا مع حذف الإشعار.
  await db.notification.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
