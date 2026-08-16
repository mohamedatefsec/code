import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import crypto from "crypto";

const ALLOWED_TYPES = ["application/pdf"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * يرفع ملف PDF إلى Vercel Blob، بنفس أسلوب رفع الصور في app/api/upload
 * لكن بحد أقصى أكبر للحجم يناسب مستندات الدروس. مسار منفصل عن رفع
 * الصور حتى يبقى لكل نوع ملف حدوده الخاصة بوضوح.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرفاق أي ملف." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مدعوم. استخدم PDF فقط." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "حجم الملف كبير جدًا. الحد الأقصى 15 ميجابايت." },
      { status: 400 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "تخزين الملفات غير مُفعّل بعد على السيرفر (BLOB_READ_WRITE_TOKEN مفقود)." },
      { status: 500 }
    );
  }

  const fileName = `${crypto.randomUUID()}.pdf`;

  const blob = await put(`documents/${fileName}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
