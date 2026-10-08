import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { blockIpSchema } from "@/lib/validation";

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const blocked = await db.blockedIp.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ blocked });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = blockIpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." },
      { status: 400 }
    );
  }

  const { ip, note } = parsed.data;
  const blocked = await db.blockedIp.upsert({
    where: { ip },
    create: { ip, note: note || null, createdBy: session.userId },
    update: { note: note || null },
  });
  return NextResponse.json({ blocked }, { status: 201 });
}
