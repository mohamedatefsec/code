import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveUser, requireAdminSession } from "@/lib/auth";

const bodySchema = z.object({ completed: z.boolean() });

/// الطالب بيدوس "خلّصت الدرس" (completed: true) أو بيرجع فيها (completed: false)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser("student");
  if (!user) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const profile = await db.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { status: true, unit: { select: { status: true } } },
  });
  if (!lesson || lesson.status !== "published" || lesson.unit.status !== "published") {
    return NextResponse.json({ error: "الدرس غير متاح." }, { status: 404 });
  }

  const completedAt = parsed.data.completed ? new Date() : null;
  try {
    await db.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: profile.id, lessonId: id } },
      create: { studentId: profile.id, lessonId: id, completedAt },
      update: { completedAt },
    });
  } catch (err) {
    console.error("[lesson-progress] complete failed", err);
    return NextResponse.json({ error: "تعذّر حفظ التقدّم دلوقتي. جرّب تاني بعد شوية." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, completed: parsed.data.completed });
}

/// للأدمن: مين من الطلاب النشطين خلّص الدرس، ومين فتحه بس، ومين لسه ما فتحوش
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const students = await db.studentProfile.findMany({
    where: { user: { status: "active" } },
    select: { id: true, fullName: true, studentCode: true, group: { select: { name: true } } },
    orderBy: { fullName: "asc" },
  });

  let rows: { studentId: string; lastOpenedAt: Date; openCount: number; completedAt: Date | null }[] = [];
  let available = true;
  try {
    rows = await db.lessonProgress.findMany({
      where: { lessonId: id },
      select: { studentId: true, lastOpenedAt: true, openCount: true, completedAt: true },
    });
  } catch {
    // الجدول لسه ما اتعملش في قاعدة البيانات
    available = false;
  }
  const byStudent = new Map(rows.map((r) => [r.studentId, r]));

  return NextResponse.json({
    available,
    students: students.map((s) => {
      const p = byStudent.get(s.id);
      return {
        id: s.id,
        name: s.fullName,
        code: s.studentCode,
        group: s.group?.name ?? null,
        state: p ? (p.completedAt ? "done" : "opened") : "none",
        lastOpenedAt: p?.lastOpenedAt ?? null,
        openCount: p?.openCount ?? 0,
        completedAt: p?.completedAt ?? null,
      };
    }),
  });
}
