import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, hashPassword } from "@/lib/auth";
import { studentCreateSchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q")?.trim();
  const groupId = searchParams.get("groupId");
  const status = searchParams.get("status"); // active | disabled

  const students = await db.studentProfile.findMany({
    where: {
      ...(groupId ? { groupId } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { studentCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { user: { status: status as "active" | "disabled" } } : {}),
    },
    include: {
      group: true,
      user: { select: { status: true, loginIdentifier: true } },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  // إجمالي المدفوع وعدد الحصص اللي حضرها كل طالب (present أو late، مش
  // absent) - بنجيبهم بـ groupBy على مستوى القاعدة كله بدل استعلام منفصل
  // لكل طالب (N+1)، وبعدين نربطهم بالقايمة في الذاكرة.
  const studentIds = students.map((s) => s.id);
  const [paymentTotals, attendanceCounts] = await Promise.all([
    db.payment.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds } },
      _sum: { amount: true },
    }),
    db.attendanceRecord.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, status: { in: ["present", "late"] } },
      _count: { _all: true },
    }),
  ]);
  const totalPaidByStudent = new Map(paymentTotals.map((p) => [p.studentId, p._sum.amount ?? 0]));
  const attendedByStudent = new Map(attendanceCounts.map((a) => [a.studentId, a._count._all]));

  const result = students.map((s) => ({
    ...s,
    totalPaid: totalPaidByStudent.get(s.id) ?? 0,
    attendedSessionsCount: attendedByStudent.get(s.id) ?? 0,
  }));

  return NextResponse.json({ students: result });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = studentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fullName, studentCode, phone, grade, groupId, password, attendanceStartDate } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const student = await db.user.create({
      data: {
        role: "student",
        loginIdentifier: studentCode,
        passwordHash,
        status: "active",
        studentProfile: {
          create: {
            fullName,
            studentCode,
            phone: phone ?? undefined,
            grade: grade ?? undefined,
            groupId: groupId ?? undefined,
            attendanceStartDate: attendanceStartDate ? new Date(attendanceStartDate) : undefined,
          },
        },
      },
      include: { studentProfile: true },
    });
    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "كود الطالب مستخدم بالفعل، اختر كودًا آخر." },
        { status: 409 }
      );
    }
    throw err;
  }
}
