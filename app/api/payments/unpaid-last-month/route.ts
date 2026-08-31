import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getUnpaidStudentsLastMonth } from "@/lib/unpaid-students";

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const result = await getUnpaidStudentsLastMonth();
  return NextResponse.json(result);
}
