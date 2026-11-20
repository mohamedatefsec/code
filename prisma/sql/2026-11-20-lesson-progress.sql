-- جدول تقدّم الطلاب في الدروس (lesson_progress)
-- شغّله مرة واحدة في Neon > SQL Editor (Branch: production, Database: neondb).
-- آمن لو اتشغّل أكتر من مرة: كل خطوة بتتأكد الأول إن الحاجة مش موجودة.

CREATE TABLE IF NOT EXISTS "lesson_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "first_opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "open_count" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_student_id_lesson_id_key"
    ON "lesson_progress"("student_id", "lesson_id");

CREATE INDEX IF NOT EXISTS "lesson_progress_lesson_id_idx"
    ON "lesson_progress"("lesson_id");

DO $$
BEGIN
    ALTER TABLE "lesson_progress"
        ADD CONSTRAINT "lesson_progress_student_id_fkey"
        FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "lesson_progress"
        ADD CONSTRAINT "lesson_progress_lesson_id_fkey"
        FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
