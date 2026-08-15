import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      status: true,
      studentProfile: { select: { fullName: true, studentCode: true, avatarUrl: true, groupId: true } },
      adminProfile: { select: { fullName: true, avatarUrl: true } },
    },
  });

  if (!user || user.status !== "active") {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user });
}
