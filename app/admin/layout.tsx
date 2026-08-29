import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/AdminShell";
import { getPlatformName } from "@/lib/settings";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveUser("admin");
  if (!user) redirect("/login");

  const [profile, platformName] = await Promise.all([
    db.adminProfile.findUnique({ where: { userId: user.id } }),
    getPlatformName(),
  ]);

  return (
    <AdminShell adminName={profile?.fullName ?? "المدير"} platformName={platformName}>
      {children}
    </AdminShell>
  );
}
