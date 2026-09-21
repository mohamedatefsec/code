/// قائمة سماح بخدمات الـ Push الحقيقية اللي المتصفحات بتستخدمها.
///
/// ليه ضرورية؟ الطالب هو اللي بيبعت "endpoint" الاشتراك للسيرفر، والسيرفر بعدين
/// بيعمل POST لنفس الرابط ده لما يتبعت إشعار. من غير قائمة سماح، أي طالب يقدر
/// يسجّل رابط داخلي أو رابط بتاعه، فيخلّي السيرفر يبعت طلبات لأي عنوان (SSRF).
const ALLOWED_HOST_SUFFIXES = [
  "fcm.googleapis.com", // Chrome / Edge / Brave / Opera / Samsung Internet
  "android.googleapis.com", // صيغة FCM القديمة
  "push.services.mozilla.com", // Firefox
  "push.apple.com", // Safari (macOS / iOS)
  "notify.windows.com", // Edge القديم / WNS
];

export function isAllowedPushEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;

  const host = url.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}
