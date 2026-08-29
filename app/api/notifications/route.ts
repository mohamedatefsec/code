import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { notificationCreateSchema } from "@/lib/validation";

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const notifications = await db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // نحسب "وصلت لكام طالب" و"قرأها كام طالب" لكل إشعار لعرضهما في اللوحة
  const enriched = await Promise.all(
    notifications.map(async (n) => {
      const audienceWhere =
        n.targetType === "all"
          ? {}
          : n.targetType === "group"
          ? { groupId: n.targetGroupId ?? undefined }
          : { id: n.targetStudentId ?? undefined };
      const audienceCount = await db.studentProfile.count({ where: audienceWhere });
      const readCount = await db.notificationRead.count({ where: { notificationId: n.id } });
      return { ...n, audienceCount, readCount };
    })
  );

  return NextResponse.json({ notifications: enriched });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = notificationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const notification = await db.notification.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      imageUrl: parsed.data.imageUrl || null,
      targetType: parsed.data.targetType,
      targetGroupId: parsed.data.targetType === "group" ? parsed.data.targetGroupId : null,
      targetStudentId: parsed.data.targetType === "student" ? parsed.data.targetStudentId : null,
      createdBy: session.userId,
    },
  });

  return NextResponse.json({ notification }, { status: 201 });
}
