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

  const attempts = await db.quizAttempt.findMany({
    where: { studentId: student.id, status: "submitted" },
    include: { quiz: { select: { title: true } } },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({ attempts });
}
