import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/**
 * يُرجع تقرير حضور شامل: لكل طالب، كل حصص الحضور المسجّلة له (التاريخ،
 * اسم الحصة، الحالة)، مع ملخّص أعداد (حاضر/متأخر/غائب) ونسبة الحضور.
 * ده بيغطي كل الطلاب في تقرير واحد بدل ما ندخل على كل حصة لوحدها.
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const groupId = req.nextUrl.searchParams.get("groupId");

  const students = await db.studentProfile.findMany({
    where: groupId ? { groupId } : {},
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      attendanceStartDate: true,
      group: { select: { id: true, name: true } },
      attendanceRecords: {
        select: {
          status: true,
          session: { select: { sessionDate: true, sessionLabel: true } },
        },
        orderBy: { session: { sessionDate: "asc" } },
      },
    },
    orderBy: [{ group: { name: "asc" } }, { fullName: "asc" }],
  });

  const report = students.map((s) => {
    // نتجاهل أي سجل حصة تاريخها قبل تاريخ بداية حضور الطالب (لو محدد) -
    // احتياط إضافي حتى لو كان فيه سجلات قديمة اتسجلت قبل ضبط هذا التاريخ.
    const records = s.attendanceRecords
      .filter((r) => !s.attendanceStartDate || r.session.sessionDate >= s.attendanceStartDate)
      .map((r) => ({
        date: r.session.sessionDate,
        label: r.session.sessionLabel,
        status: r.status,
      }));
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const total = records.length;
    // الحاضر والمتأخر بيتحسبوا كحضور فعلي للنسبة، والغائب بس هو اللي بيخصم.
    const attendancePercentage = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : null;

    return {
      studentId: s.id,
      fullName: s.fullName,
      studentCode: s.studentCode,
      groupName: s.group?.name ?? null,
      records,
      summary: { present, late, absent, total, attendancePercentage },
    };
  });

  return NextResponse.json({ report });
}
