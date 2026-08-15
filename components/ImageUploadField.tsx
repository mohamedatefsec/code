"use client";

import { useRef, useState } from "react";

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="text-ink-soft text-xs">تعذّر التحميل</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- معاينة صورة مرفوعة محليًا، ليست من next/image
    <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setFailed(true)} />
  );
}

export function ImageUploadField({
  label,
  value,
  onChange,
  shape = "square",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  shape?: "square" | "circle";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      onChange(data.url);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر رفع الصورة.");
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className={`shrink-0 grid place-items-center w-16 h-16 border border-border bg-canvas overflow-hidden ${
            shape === "circle" ? "rounded-full" : "rounded-lg"
          }`}
        >
          {value ? (
            <ImagePreview src={value} alt={label} />
          ) : (
            <span className="text-ink-soft text-xs">لا صورة</span>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-canvas disabled:opacity-60"
            >
              {uploading ? "جارٍ الرفع..." : value ? "تغيير الصورة" : "رفع صورة"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-sm text-danger hover:underline"
              >
                إزالة
              </button>
            )}
          </div>
          <p className="text-xs text-ink-soft">PNG أو JPG أو WEBP، حتى 3 ميجابايت.</p>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
