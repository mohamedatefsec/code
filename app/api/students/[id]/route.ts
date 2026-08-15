import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { studentUpdateSchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const student = await db.studentProfile.findUnique({
    where: { id },
    include: { group: true, user: { select: { status: true, loginIdentifier: true } } },
  });

  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ student });
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
  const parsed = studentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { studentCode, ...rest } = parsed.data;

  try {
    // كود الطالب هو نفسه loginIdentifier في جدول المصادقة، لازم يتزامنا معًا
    // داخل معاملة واحدة (transaction) حتى لا يحدث تعارض جزئي بين الجدولين.
    const student = await db.$transaction(async (tx) => {
      const updated = await tx.studentProfile.update({
        where: { id },
        data: {
          ...rest,
          ...(studentCode ? { studentCode } : {}),
        },
      });
      if (studentCode) {
        await tx.user.update({
          where: { id: updated.userId },
          data: { loginIdentifier: studentCode },
        });
      }
      return updated;
    });

    return NextResponse.json({ student });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const student = await db.studentProfile.findUnique({ where: { id } });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
  }

  // حذف الـ User يحذف تلقائيًا الـ StudentProfile المرتبط به (onDelete: Cascade)
  await db.user.delete({ where: { id: student.userId } });
  return NextResponse.json({ ok: true });
}
