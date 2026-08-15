import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const student = await db.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const notifications = await db.notification.findMany({
    where: {
      OR: [
        { targetType: "all" },
        ...(student.groupId
          ? [{ targetType: "group" as const, targetGroupId: student.groupId }]
          : []),
        { targetType: "student", targetStudentId: student.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      reads: { where: { studentId: student.id }, select: { readAt: true } },
    },
  });

  const result = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    isRead: n.reads.length > 0,
  }));

  return NextResponse.json({ notifications: result });
}
