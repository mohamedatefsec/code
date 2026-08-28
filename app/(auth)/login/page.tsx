import { db } from "@/lib/db";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const settings = await db.settings.findFirst();
  return <LoginForm platformName={settings?.platformName ?? "Code AI"} />;
}
