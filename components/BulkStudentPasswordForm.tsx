"use client";

import { useState, FormEvent } from "react";

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15";

export function BulkStudentPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "كلمة المرور وتأكيدها غير متطابقين." });
      return;
    }

    const confirmed = window.confirm(
      "هتتغيّر كلمة مرور كل الطلاب المسجّلين في المنصة إلى الكلمة اللي كتبتها الآن. متأكد إنك عايز تكمل؟"
    );
    if (!confirmed) return;

    setSaving(true);
    const res = await fetch("/api/students/bulk-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);

    if (res.ok) {
      const data = await res.json();
      setMessage({
        type: "ok",
        text: `تم تطبيق كلمة المرور الجديدة على ${data.count} حساب طالب بنجاح.`,
      });
      setPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json().catch(() => null);
      setMessage({ type: "error", text: data?.error ?? "تعذّر تطبيق كلمة المرور." });
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-warn/40 bg-warn-soft/40 p-6 shadow-elevated">
      <div>
        <h2 className="font-semibold text-ink">كلمة مرور افتراضية لكل الطلاب</h2>
        <p className="text-sm text-ink-soft mt-1">
          اكتب كلمة مرور واحدة وطبّقها فورًا على كل حسابات الطلاب دفعة واحدة
          (مفيد مثلاً في بداية كل ترم). هذا لا يمنع تغيير كلمة مرور طالب
          بعينه لاحقًا من صفحة تعديل الطالب.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              كلمة المرور الافتراضية
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="off"
              className={inputClass}
              placeholder="مثال: Codeai2026"
            />
            <p className="text-xs text-ink-soft mt-1">6 أحرف على الأقل.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">تأكيد كلمة المرور</label>
            <input
              type="text"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="off"
              className={inputClass}
            />
          </div>
        </div>

        {message && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-2.5 text-sm ${
              message.type === "ok"
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg border border-warn/50 bg-white/60 px-5 py-2.5 font-semibold text-warn hover:bg-white transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ التطبيق..." : "تطبيق على كل الطلاب"}
        </button>
      </form>
    </div>
  );
}
