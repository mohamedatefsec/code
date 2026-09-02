/// أفاتار موحّد يُستخدم في هيدر/شريط الإدارة - يعرض صورة البروفايل لو
/// موجودة، وإلا دائرة متدرّجة بالحرف الأول من الاسم (بديل بصري متّسق
/// بدل أيقونة عامة، وبيدي هوية شخصية للمنصة زي البروفايل في أعلى يمين
/// اللوحة المرجعية).
export function Avatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initial = name.trim().charAt(0) || "؟";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0 ring-2 ring-white/10"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid place-items-center rounded-full shrink-0 font-bold text-white shadow-glow ring-2 ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "var(--gradient-brand)",
      }}
    >
      {initial}
    </span>
  );
}
