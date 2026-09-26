import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { attendanceRecordsUpdateSchema } from "@/lib/validation";
import { evaluateAttendanceBadge } from "@/lib/badges";
import { applyAbsenceConsequences } from "@/lib/attendance-warnings";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = attendanceRecordsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const session = await db.attendanceSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "الحصة غير موجودة." }, { status: 404 });
  }

  // حالة كل طالب في هذه الحصة *قبل* الحفظ - عشان نعرف مين "غاب دلوقتي لأول
  // مرة في هذه الحصة تحديدًا" ومنكررش تحذير/تعطيل الغياب لو الأدمن بيعدّل
  // نفس الحصة تاني من غير ما يغيّر حالة الغياب.
  const existingRecords = await db.attendanceRecord.findMany({
    where: {
      sessionId: id,
      studentId: { in: parsed.data.records.map((r) => r.studentId) },
    },
    select: { studentId: true, status: true },
  });
  const previousStatuses = new Map(existingRecords.map((r) => [r.studentId, r.status as string]));

  await db.$transaction(
    parsed.data.records.map((r) =>
      db.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: id, studentId: r.studentId } },
        update: { status: r.status },
        create: { sessionId: id, studentId: r.studentId, status: r.status },
      })
    )
  );

  // تقييم شارة "حضور ممتاز" لكل طالب اتسجّل له حضور في هذه الحصة، بمعزل عن
  // نجاح الحفظ نفسه حتى لا يُفشل الحفظ لو حصل خطأ بسيط في تقييم الشارات.
  try {
    await Promise.all(
      parsed.data.records.map((r) => evaluateAttendanceBadge(r.studentId))
    );
  } catch {
    // تجاهل بهدوء
  }

  // تحذير أول غياب + تعطيل تلقائي عند حصتين غياب متتاليتين. بمعزل عن نجاح
  // حفظ الحضور نفسه - فشل هنا لا يجب أن يفشّل الحفظ.
  let warnedStudentIds: string[] = [];
  let disabledStudentIds: string[] = [];
  try {
    const result = await applyAbsenceConsequences(id, session.groupId, parsed.data.records, previousStatuses);
    warnedStudentIds = result.warnedStudentIds;
    disabledStudentIds = result.disabledStudentIds;
  } catch {
    // تجاهل بهدوء
  }

  return NextResponse.json({ ok: true, warnedStudentIds, disabledStudentIds });
}
