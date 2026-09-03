import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });

  const profile = await db.adminProfile.findUnique({ where: { userId: session.userId } });
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }

  const { fullName, avatarUrl } = body as { fullName?: string; avatarUrl?: string | null };

  const data: { fullName?: string; avatarUrl?: string | null } = {};
  if (typeof fullName === "string" && fullName.trim()) data.fullName = fullName.trim();
  if (avatarUrl === null || typeof avatarUrl === "string") data.avatarUrl = avatarUrl || null;

  const profile = await db.adminProfile.upsert({
    where: { userId: session.userId },
    update: data,
    create: {
      userId: session.userId,
      fullName: data.fullName ?? "المدير",
      avatarUrl: data.avatarUrl ?? null,
    },
  });

  return NextResponse.json({ profile });
}
