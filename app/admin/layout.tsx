import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveUser("admin");
  if (!user) redirect("/login");

  const profile = await db.adminProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <AdminShell adminName={profile?.fullName ?? "المدير"}>
      {children}
    </AdminShell>
  );
}
