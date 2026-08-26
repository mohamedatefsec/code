import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { attendanceSessionUpdateSchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const session = await db.attendanceSession.findUnique({
    where: { id },
    include: { records: true, group: { select: { id: true, name: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "الحصة غير موجودة." }, { status: 404 });
  }

  const students = await db.studentProfile.findMany({
    where: {
      groupId: session.groupId,
      user: { status: "active" },
      // نستبعد أي طالب حُدد له تاريخ بداية حضور لاحق لتاريخ هذه الحصة -
      // يعني حصص قبل انضمامه الفعلي متتسجلش عليه خالص (لا حضور ولا غياب).
      OR: [{ attendanceStartDate: null }, { attendanceStartDate: { lte: session.sessionDate } }],
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, studentCode: true },
  });

  const recordByStudent = new Map(session.records.map((r) => [r.studentId, r.status]));
  const roster = students.map((s) => ({
    studentId: s.id,
    fullName: s.fullName,
    studentCode: s.studentCode,
    // الطالب اللي لسه معندوش سجل لهذه الحصة يُفترض "حاضر" افتراضيًا لتقليل
    // عدد الضغطات على الأدمن، ويقدر يبدّلها بسهولة لغائب/متأخر.
    status: recordByStudent.get(s.id) ?? "present",
  }));

  return NextResponse.json({
    session: { id: session.id, sessionDate: session.sessionDate, sessionLabel: session.sessionLabel, group: session.group },
    roster,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = attendanceSessionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await db.attendanceSession.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "الحصة غير موجودة." }, { status: 404 });
  }

  const { sessionDate, sessionLabel } = parsed.data;
  const normalizedLabel = sessionLabel?.trim() || null;

  try {
    const updated = await db.attendanceSession.update({
      where: { id },
      data: {
        sessionDate: new Date(sessionDate),
        sessionLabel: normalizedLabel,
      },
    });
    return NextResponse.json({ session: updated });
  } catch (err) {
    // نفس المجموعة + نفس التاريخ + نفس اسم الحصة = تعارض مع حصة تانية موجودة بالفعل
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "توجد حصة أخرى بنفس التاريخ والاسم لهذه المجموعة بالفعل." },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  await db.attendanceSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
