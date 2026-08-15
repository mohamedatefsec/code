import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { attendanceSessionCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  const sessions = await db.attendanceSession.findMany({
    where: { ...(groupId ? { groupId } : {}) },
    include: { group: { select: { name: true } }, _count: { select: { records: true } } },
    orderBy: { sessionDate: "desc" },
  });

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = attendanceSessionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { groupId, sessionDate, sessionLabel } = parsed.data;
  const normalizedLabel = sessionLabel?.trim() || null;

  // "فتح حصة" عملية آمنة للتكرار: لو الحصة موجودة بالفعل لنفس المجموعة/التاريخ/الاسم
  // نرجّعها بدل ما نعمل واحدة مكررة (بيسمح للأدمن يرجع يعدّل حصة قديمة بسهولة).
  const existing = await db.attendanceSession.findFirst({
    where: {
      groupId,
      sessionDate: new Date(sessionDate),
      sessionLabel: normalizedLabel,
    },
  });
  if (existing) {
    return NextResponse.json({ session: existing });
  }

  const created = await db.attendanceSession.create({
    data: {
      groupId,
      sessionDate: new Date(sessionDate),
      sessionLabel: normalizedLabel,
      createdBy: session.userId,
    },
  });

  return NextResponse.json({ session: created }, { status: 201 });
}
