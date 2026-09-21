import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "published"]),
});

/// نشر سؤال مراجعة / إرجاعه لمسودة (يختفي من عند الطلاب، وإجاباتهم تفضل محفوظة).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "حالة غير صالحة." }, { status: 400 });
  }

  try {
    const question = await db.reviewQuestion.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });
    return NextResponse.json({ question });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
    }
    throw err;
  }
}
