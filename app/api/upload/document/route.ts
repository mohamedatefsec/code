import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * يصدر توكن رفع مباشر للمتصفح (Vercel Blob client upload) بدل استقبال الملف
 * في جسم الطلب. Vercel Functions لها حد أقصى صارم 4.5 ميجابايت لحجم جسم
 * الطلب على مستوى البنية التحتية (لا يمكن رفعه من الكود)، فأي ملف PDF أكبر
 * من ذلك كان سيفشل دائمًا مع الطريقة القديمة (رفع الملف كاملًا عبر الـ
 * route). هنا المتصفح يرفع الملف مباشرة إلى Vercel Blob بعد الحصول على
 * توكن مؤقّت من هذا المسار، فلا يمر الملف على السيرفر إطلاقًا.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await requireAdminSession())) {
          throw new Error("غير مصرّح.");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // لا حاجة لأي إجراء إضافي؛ الواجهة الأمامية تستخدم رابط الملف
        // المُعاد مباشرة من نتيجة الرفع لإضافته كوسيط للدرس.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذّر رفع الملف." },
      { status: 400 }
    );
  }
}
