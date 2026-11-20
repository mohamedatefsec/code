-- جدولة النشر: عمود "ميعاد النشر التلقائي" للدروس والاختبارات
-- شغّله في Neon > SQL Editor (Branch: production, Database: neondb)
-- لازم يتشغّل قبل رفع الكود (git push).
-- آمن لو اتشغّل أكتر من مرة، وبيضيف أعمدة فاضية بس من غير ما يغيّر أي بيانات.

ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "publish_at" TIMESTAMP(3);
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "publish_at" TIMESTAMP(3);
