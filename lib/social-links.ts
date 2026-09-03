/// بيحوّل أي حاجة يدخّلها الأدمن في حقل واتساب (رقم هاتف، رقم برابط جزئي،
/// أو رابط wa.me كامل) لرابط https:// صحيح دايمًا.
///
/// المشكلة الأصلية: لو الأدمن كتب رقم زي "01001234567" أو "wa.me/201001234567"
/// من غير "https://"، المتصفح كان بيتعامل معاه كمسار نسبي جوه نفس الموقع
/// (زي "/01001234567")، فيظهر 404 بدل ما يفتح واتساب.
export function normalizeWhatsappLink(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  // رابط كامل بالفعل (http/https) - نستخدمه زي ما هو.
  if (/^https?:\/\//i.test(value)) return value;

  // كاتب الدومين من غير بروتوكول (wa.me/... أو api.whatsapp.com/...).
  if (/^(wa\.me|api\.whatsapp\.com)\//i.test(value)) return `https://${value}`;

  // غير كده، نتعامل معاه كرقم هاتف: نسيب الأرقام و+ بس، ونبني رابط wa.me.
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}
