import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import crypto from "crypto";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

/**
 * يرفع الصورة إلى Vercel Blob (تخزين خارجي دائم يعمل على أي بيئة
 * serverless بدون فقدان الملفات بين عمليات التشغيل).
 *
 * يتطلب متغير البيئة BLOB_READ_WRITE_TOKEN — يُضاف تلقائيًا لو فعّلت
 * Vercel Blob Store من لوحة تحكم المشروع على Vercel (Storage → Create
 * Database → Blob). محليًا، شغّل `vercel env pull` لجلب نفس القيمة، أو
 * أنشئ متجر Blob مستقل وضِف التوكن يدويًا في .env.
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
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم. استخدم PNG أو JPG أو WEBP أو GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "حجم الصورة كبير جدًا. الحد الأقصى 3 ميجابايت." },
      { status: 400 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "تخزين الصور غير مُفعّل بعد على السيرفر (BLOB_READ_WRITE_TOKEN مفقود)." },
      { status: 500 }
    );
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const blob = await put(`uploads/${fileName}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
