import { LoginForm } from "@/components/LoginForm";
import { getPlatformName, getPrimaryAdminBrand } from "@/lib/settings";

export default async function LoginPage() {
  const [platformName, adminBrand] = await Promise.all([
    getPlatformName(),
    getPrimaryAdminBrand(),
  ]);
  return (
    <LoginForm
      platformName={platformName}
      adminAvatarUrl={adminBrand.avatarUrl}
      adminName={adminBrand.fullName}
    />
  );
}
