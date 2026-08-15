import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingPage from "@/components/LandingPage";

export default async function RootPage() {
  const session = await getCurrentSession();
  if (session?.role === "admin") redirect("/admin/dashboard");
  if (session?.role === "student") redirect("/dashboard");
  return <LandingPage />;
}
