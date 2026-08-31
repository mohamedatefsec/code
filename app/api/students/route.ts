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

  return NextResponse.json({ students });
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
