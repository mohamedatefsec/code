import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const attempts = await db.quizAttempt.findMany({
    where: { status: "submitted", needsManualGrading: true },
    orderBy: { submittedAt: "asc" },
    include: {
      quiz: { select: { title: true } },
      student: { select: { fullName: true, studentCode: true } },
    },
  });

  return NextResponse.json({ attempts });
}
