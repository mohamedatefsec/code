import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentShell } from "@/components/StudentShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveUser("student");
  if (!user) redirect("/login");

  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <StudentShell studentName={profile?.fullName ?? "الطالب"}>
      {children}
    </StudentShell>
  );
}
