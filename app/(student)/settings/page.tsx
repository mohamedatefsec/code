"use client";

import { useState } from "react";

export default function StudentSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقين.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/students/me/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);

    if (res.ok) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر تغيير كلمة المرور.");
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">الإعدادات</h1>
        <p className="text-sm text-ink-soft mt-1">غيّر كلمة مرور حسابك الخاص بك.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-elevated"
      >
        <h2 className="font-semibold text-ink">تغيير كلمة المرور</h2>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">كلمة المرور الحالية</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-canvas text-ink"
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">كلمة المرور الجديدة</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-canvas text-ink"
            autoComplete="new-password"
          />
          <p className="text-xs text-ink-soft mt-1">8 أحرف على الأقل.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-canvas text-ink"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
            تم تغيير كلمة المرور بنجاح.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
        </button>
      </form>

      <p className="text-xs text-ink-soft">
        🔒 كلمة مرورك خاصة بك فقط وهى محمية بنظام التشفير التام والمؤمن.
      </p>
    </div>
  );
}
