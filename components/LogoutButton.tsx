"use client";

import { useState } from "react";

/// زرار تسجيل الخروج. المشاكل اللي كانت فيه على الموبايل:
/// 1) مكانش فيه مهلة ولا try/catch: لو الطلب اتعلّق أو فشل (شبكة موبايل
///    ضعيفة) الزرار كان يفضل معطّل على "جارٍ الخروج..." للأبد.
/// 2) كان بيستخدم router.push("/login") (تنقّل داخلي)، ولو الراوتر كان
///    مخزّن نتيجة قديمة لصفحة /login (تحويل للوحة وقت ما كان مسجّل دخول)
///    ممكن يرجّعه للوحة وكأن الخروج ما حصلش.
/// دلوقتي: مهلة 10 ثواني، ولو فشل الخروج بنقول ده بوضوح ونسيب الزرار
/// يتعاد، ولو نجح بنعمل تحميل كامل لصفحة الدخول (من غير أي كاش للراوتر).
const LOGOUT_TIMEOUT_MS = 10_000;

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    setFailed(false);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("logout failed");
      // تنقّل كامل (مش router.push) عشان صفحة الدخول تتحمّل من السيرفر
      // والكوكي المحذوف يتقرأ صح، ومفيش كاش قديم يرجّعه للوحة.
      window.location.assign("/login");
    } catch {
      // الكوكي بتاع الجلسة httpOnly ومينفعش يتمسح من المتصفح، فلو الطلب
      // ما وصلش لازم نوضّح للمستخدم بدل ما نوهمه إنه خرج.
      setFailed(true);
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`text-sm font-medium transition disabled:opacity-60 ${
        failed ? "text-danger" : "text-ink-soft hover:text-danger"
      }`}
    >
      {loading ? "جارٍ الخروج..." : failed ? "تعذّر الخروج - اضغط للمحاولة تاني" : "تسجيل الخروج"}
    </button>
  );
}
