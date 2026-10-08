import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { requireActiveUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/login-throttle";
import { isIpBlocked } from "@/lib/ip-security";
import { StudentShell } from "@/components/StudentShell";
import { getPlatformName, getPlatformTagline, getPrimaryAdminBrand } from "@/lib/settings";

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
    if (hadStaleSession && (await isIpBlocked(clientIp(await headers())))) {
      redirect("/login?reason=blocked");
    }
    redirect(hadStaleSession ? "/login?reason=session-ended" : "/login");
  }

  const [profile, platformName, tagline, adminBrand] = await Promise.all([
    db.studentProfile.findUnique({ where: { userId: user.id } }),
    getPlatformName(),
    getPlatformTagline(),
    getPrimaryAdminBrand(),
  ]);

  return (
    <StudentShell
      studentName={profile?.fullName ?? "الطالب"}
      platformName={platformName}
      tagline={tagline}
      adminAvatarUrl={adminBrand.avatarUrl}
      adminName={adminBrand.fullName}
    >
      {children}
    </StudentShell>
  );
}
