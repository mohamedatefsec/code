"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { ImageUploadField } from "@/components/ImageUploadField";

type ContactInfo = { email?: string; phone?: string };
type SocialLinks = { facebook?: string; instagram?: string; youtube?: string; whatsapp?: string };

type Settings = {
  id: string;
  platformName: string;
  teacherName: string | null;
  teacherPhotoUrl: string | null;
  description: string | null;
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage: string | null;
  footerText: string | null;
  heroHeadline: string | null;
  heroBadges: string[] | null;
  contactInfo: ContactInfo | null;
  socialLinks: SocialLinks | null;
};

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) =>
        setSettings({
          ...data.settings,
          heroBadges: Array.isArray(data.settings.heroBadges)
            ? data.settings.heroBadges
            : ["", "", ""],
          contactInfo: data.settings.contactInfo ?? {},
          socialLinks: data.settings.socialLinks ?? {},
        })
      );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformName: settings.platformName,
        teacherName: settings.teacherName,
        teacherPhotoUrl: settings.teacherPhotoUrl || null,
        description: settings.description,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        welcomeMessage: settings.welcomeMessage,
        footerText: settings.footerText,
        heroHeadline: settings.heroHeadline,
        heroBadges: (settings.heroBadges ?? []).map((b) => b.trim()).filter(Boolean),
        contactInfo: settings.contactInfo,
        socialLinks: settings.socialLinks,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage({ type: "ok", text: "تم حفظ الإعدادات بنجاح." });
    } else {
      const data = await res.json().catch(() => null);
      setMessage({ type: "error", text: data?.error ?? "تعذّر الحفظ." });
    }
  }

  if (!settings) {
    return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;
  }

  function field<K extends keyof Settings>(key: K) {
    return {
      value: (settings![key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setSettings({ ...settings!, [key]: e.target.value }),
    };
  }

  function badgeField(index: number) {
    return {
      value: settings!.heroBadges?.[index] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = [...(settings!.heroBadges ?? ["", "", ""])];
        next[index] = e.target.value;
        setSettings({ ...settings!, heroBadges: next });
      },
    };
  }

  function contactField(key: keyof ContactInfo) {
    return {
      value: settings!.contactInfo?.[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setSettings({ ...settings!, contactInfo: { ...settings!.contactInfo, [key]: e.target.value } }),
    };
  }

  function socialField(key: keyof SocialLinks) {
    return {
      value: settings!.socialLinks?.[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setSettings({ ...settings!, socialLinks: { ...settings!.socialLinks, [key]: e.target.value } }),
    };
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">الإعدادات</h1>
          <p className="text-sm text-ink-soft mt-1">
            هوية المنصة والصفحة الرئيسية العامة — تُحفظ في قاعدة البيانات وتظهر فورًا دون تعديل الكود.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="text-sm text-primary hover:underline shrink-0"
        >
          👁️ معاينة الصفحة الرئيسية
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* الهوية العامة */}
        <div className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated">
          <h2 className="font-semibold text-ink">الهوية العامة</h2>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">اسم المنصة</label>
            <input {...field("platformName")} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">اسم المدرّس</label>
            <input {...field("teacherName")} className={inputClass} />
          </div>

          <ImageUploadField
            label="صورة المدرّس"
            value={settings.teacherPhotoUrl ?? ""}
            onChange={(url) => setSettings({ ...settings, teacherPhotoUrl: url || null })}
            shape="circle"
          />

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">الوصف</label>
            <textarea {...field("description")} rows={2} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">اللون الأساسي</label>
              <div className="flex items-center gap-2">
                <input type="color" {...field("primaryColor")} className="h-10 w-14 rounded border border-border" />
                <input {...field("primaryColor")} className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">اللون الثانوي</label>
              <div className="flex items-center gap-2">
                <input type="color" {...field("secondaryColor")} className="h-10 w-14 rounded border border-border" />
                <input {...field("secondaryColor")} className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* الصفحة الرئيسية */}
        <div className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated">
          <div>
            <h2 className="font-semibold text-ink">الصفحة الرئيسية العامة</h2>
            <p className="text-sm text-ink-soft mt-0.5">
              يشوفها أي زائر قبل تسجيل الدخول — الإحصائيات (عدد الطلاب والدروس) تُحسب تلقائيًا من بياناتك الحقيقية.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">العنوان الرئيسي الكبير</label>
            <input {...field("heroHeadline")} placeholder="تعلم البرمجة والذكاء الاصطناعي" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">الجملة المميّزة تحت العنوان</label>
            <input {...field("welcomeMessage")} placeholder="مع أستاذ محمد عاطف" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">3 عبارات قصيرة (مميزات)</label>
            <div className="grid sm:grid-cols-3 gap-3">
              <input {...badgeField(0)} placeholder="شرح مبسط وممتع" className={inputClass} />
              <input {...badgeField(1)} placeholder="اختبارات تفاعلية" className={inputClass} />
              <input {...badgeField(2)} placeholder="متابعة شخصية" className={inputClass} />
            </div>
          </div>
        </div>

        {/* التواصل */}
        <div className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated">
          <h2 className="font-semibold text-ink">التواصل والروابط</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">البريد الإلكتروني</label>
              <input {...contactField("email")} placeholder="teacher@example.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">رقم الهاتف</label>
              <input {...contactField("phone")} placeholder="+20 1xx xxx xxxx" className={inputClass} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">فيسبوك</label>
              <input {...socialField("facebook")} placeholder="https://facebook.com/..." className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">إنستجرام</label>
              <input {...socialField("instagram")} placeholder="https://instagram.com/..." className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">يوتيوب</label>
              <input {...socialField("youtube")} placeholder="https://youtube.com/..." className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">واتساب</label>
              <input {...socialField("whatsapp")} placeholder="https://wa.me/..." className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">نص الفوتر</label>
            <input {...field("footerText")} className={inputClass} />
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
          className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}
