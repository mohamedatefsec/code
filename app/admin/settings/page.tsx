"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { BulkStudentPasswordForm } from "@/components/BulkStudentPasswordForm";

type ContactInfo = { email?: string; phone?: string };
type SocialLinks = { facebook?: string; instagram?: string; youtube?: string; whatsapp?: string };
type Feature = { icon: string; title: string; desc: string };

const DEFAULT_FEATURES: Feature[] = [
  { icon: "📚", title: "محتوى منظّم", desc: "دروس مقسّمة لوحدات واضحة، بفيديوهات وملفات وشرح مكتوب." },
  { icon: "❓", title: "بنك أسئلة متنوع", desc: "اختيار من متعدد، صح وخطأ، ترتيب، أسئلة برمجية، وأسئلة مقالية." },
  { icon: "⏱️", title: "اختبارات فورية", desc: "تصحيح تلقائي لحظة التسليم، ونتيجة تفصيلية لكل سؤال." },
  { icon: "🏆", title: "تحفيز مستمر", desc: "شارات إنجاز وإشعارات تبقيك متابعًا لتقدّمك أول بأول." },
];

type Settings = {
  id: string;
  platformName: string;
  teacherName: string | null;
  teacherPhotoUrl: string | null;
  teacherPhotoUrl2: string | null;
  description: string | null;
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage: string | null;
  footerText: string | null;
  heroHeadline: string | null;
  heroBadges: string[] | null;
  featuresTitle: string | null;
  features: Feature[] | null;
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
          features:
            Array.isArray(data.settings.features) && data.settings.features.length > 0
              ? data.settings.features
              : DEFAULT_FEATURES,
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
        teacherPhotoUrl2: settings.teacherPhotoUrl2 || null,
        description: settings.description,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        welcomeMessage: settings.welcomeMessage,
        footerText: settings.footerText,
        heroHeadline: settings.heroHeadline,
        heroBadges: (settings.heroBadges ?? []).map((b) => b.trim()).filter(Boolean),
        featuresTitle: settings.featuresTitle,
        features: (settings.features ?? [])
          .map((f) => ({ icon: f.icon.trim(), title: f.title.trim(), desc: f.desc.trim() }))
          .filter((f) => f.title && f.desc),
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

  function updateFeature(index: number, key: keyof Feature, value: string) {
    const next = [...(settings!.features ?? [])];
    next[index] = { ...next[index], [key]: value };
    setSettings({ ...settings!, features: next });
  }

  function addFeature() {
    const current = settings!.features ?? [];
    if (current.length >= 8) return;
    setSettings({ ...settings!, features: [...current, { icon: "✨", title: "", desc: "" }] });
  }

  function removeFeature(index: number) {
    const next = (settings!.features ?? []).filter((_, i) => i !== index);
    setSettings({ ...settings!, features: next });
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

          <div className="border-t border-border pt-5 space-y-4">
            <ImageUploadField
              label="صورة ثانية للمدرّس (اختياري)"
              value={settings.teacherPhotoUrl2 ?? ""}
              onChange={(url) => setSettings({ ...settings, teacherPhotoUrl2: url || null })}
              shape="circle"
            />
            <p className="text-xs text-ink-soft">
              لو حطيت صورة هنا، هتظهر جنب الصورة الأولى في الصفحة الرئيسية تحت نفس الاسم (زاوية تانية أو صورة إضافية لنفس المدرّس).
            </p>
          </div>

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

        {/* قسم "ليه المنصة؟" */}
        <div className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated">
          <div>
            <h2 className="font-semibold text-ink">قسم &quot;ليه المنصة؟&quot;</h2>
            <p className="text-sm text-ink-soft mt-0.5">
              بطاقات المميزات اللي بتظهر تحت المسارات في الصفحة الرئيسية. عدّل أو احذف أي بطاقة، أو ضيف بطاقة جديدة.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">عنوان القسم</label>
            <input
              value={settings.featuresTitle ?? ""}
              onChange={(e) => setSettings({ ...settings, featuresTitle: e.target.value })}
              placeholder={`ليه ${settings.platformName}؟`}
              className={inputClass}
            />
          </div>

          <div className="space-y-3">
            {(settings.features ?? []).map((f, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <input
                  value={f.icon}
                  onChange={(e) => updateFeature(i, "icon", e.target.value)}
                  placeholder="🎯"
                  className="w-16 shrink-0 rounded-lg border border-border px-2 py-2 text-center text-lg"
                />
                <div className="flex-1 space-y-2">
                  <input
                    value={f.title}
                    onChange={(e) => updateFeature(i, "title", e.target.value)}
                    placeholder="عنوان الميزة"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium"
                  />
                  <textarea
                    value={f.desc}
                    onChange={(e) => updateFeature(i, "desc", e.target.value)}
                    placeholder="وصف قصير للميزة"
                    rows={2}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFeature(i)}
                  className="shrink-0 rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                  aria-label="حذف الميزة"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {(settings.features?.length ?? 0) < 8 && (
            <button
              type="button"
              onClick={addFeature}
              className="rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink hover:border-primary transition-colors"
            >
              + إضافة ميزة
            </button>
          )}
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

      <ChangePasswordForm />

      <BulkStudentPasswordForm />
    </div>
  );
}
