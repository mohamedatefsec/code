import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

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
    where: { groupId: session.groupId, user: { status: "active" } },
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
