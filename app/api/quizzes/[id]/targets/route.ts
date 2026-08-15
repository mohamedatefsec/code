import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { quizTargetsUpdateSchema } from "@/lib/validation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = quizTargetsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, groupIds } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.quizTarget.deleteMany({ where: { quizId: id } });
    if (mode === "groups" && groupIds.length > 0) {
      await tx.quizTarget.createMany({
        data: groupIds.map((groupId) => ({
          quizId: id,
          targetType: "group" as const,
          groupId,
        })),
      });
    }
  });

  const targets = await db.quizTarget.findMany({
    where: { quizId: id },
    include: { group: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ targets });
}
