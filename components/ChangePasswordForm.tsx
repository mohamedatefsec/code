"use client";

import { useState, FormEvent } from "react";

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "كلمة المرور الجديدة وتأكيدها غير متطابقين." });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (res.ok) {
      setMessage({ type: "ok", text: "تم تغيير كلمة المرور بنجاح." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json().catch(() => null);
      setMessage({ type: "error", text: data?.error ?? "تعذّر تغيير كلمة المرور." });
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated">
      <div>
        <h2 className="font-semibold text-ink">تغيير كلمة المرور</h2>
        <p className="text-sm text-ink-soft mt-1">
          غيّر كلمة مرور حسابك الحالي. ستحتاج لإدخال كلمة المرور الحالية أولًا.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">كلمة المرور الحالية</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
            <p className="text-xs text-ink-soft mt-1">8 أحرف على الأقل.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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
          className="rounded-lg border border-border px-5 py-2.5 font-semibold text-ink hover:bg-canvas transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
        </button>
      </form>
    </div>
  );
}
