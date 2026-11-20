/// يرجّع رابط http/https آمن للعرض في <a href>، أو null لو الرابط مش آمن.
///
/// الروابط دي (تواصل اجتماعي، روابط الدروس) بيدخّلها الأدمن وبتتعرض للزوار/الطلاب،
/// فبنمنع أي بروتوكول تاني (javascript: / data: / vbscript:) اللي ممكن ينفّذ كود
/// لما حد يضغط على الرابط. رابط من غير بروتوكول (facebook.com/page) بنكمّله https://.
export function safeHttpUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      new URL(value);
      return value;
    } catch {
      return null;
    }
  }

  // أي بروتوكول تاني (كلمة متبوعة بـ : ) مرفوض
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;

  // "//evil.com" أو مسار يبدأ بـ / مش رابط خارجي صالح هنا
  if (value.startsWith("/")) return null;

  try {
    const withScheme = `https://${value}`;
    new URL(withScheme);
    return withScheme;
  } catch {
    return null;
  }
}

/// بيقبل بس مسار داخلي في نفس المنصة (يبدأ بـ "/" ومش "//" ولا فيه "\\")،
/// عشان رابط الإشعار مايقدرش يودّي الطالب لموقع خارجي أبدًا.
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  return v;
}
