import { LoginForm } from "@/components/LoginForm";
import { getPlatformName, getPrimaryAdminBrand } from "@/lib/settings";

// لازم الصفحة تتولّد عند كل طلب: من غير السطر ده Next كان بيولّدها مرة واحدة وقت البناء
// (build) ويثبّتها، فأي تغيير في صورة الأدمن أو اسم المنصة مكانش بيظهر في صفحة تسجيل
// الدخول إلا بعد نشر جديد.
export const dynamic = "force-dynamic";

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
