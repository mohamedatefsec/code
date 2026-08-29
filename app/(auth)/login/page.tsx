import { LoginForm } from "@/components/LoginForm";
import { getPlatformName } from "@/lib/settings";

export default async function LoginPage() {
  const platformName = await getPlatformName();
  return <LoginForm platformName={platformName} />;
}
