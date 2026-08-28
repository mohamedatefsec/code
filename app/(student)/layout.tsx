import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireActiveUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentShell } from "@/components/StudentShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveUser("student");
  if (!user) {
    // لو فيه كوكي جلسة موجودة فعلاً بس اترفضت (بدل ما تكون غير موجودة من
    // الأساس)، الأرجح إنها اتلغيت لأن الحساب اتسجّل دخوله من جهاز تاني (أو
    // انتهت صلاحيتها) - نوريله سبب واضح بدل ما يتفاجئ من غير تفسير.
    const cookieStore = await cookies();
    const hadStaleSession = Boolean(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    redirect(hadStaleSession ? "/login?reason=session-ended" : "/login");
  }

  const [profile, settings] = await Promise.all([
    db.studentProfile.findUnique({ where: { userId: user.id } }),
    db.settings.findFirst(),
  ]);

  return (
    <StudentShell
      studentName={profile?.fullName ?? "الطالب"}
      platformName={settings?.platformName ?? "Code AI"}
    >
      {children}
    </StudentShell>
  );
}
