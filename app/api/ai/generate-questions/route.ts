import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { aiGenerateQuestionsSchema, validateQuestionBusinessRules } from "@/lib/validation";
import { generateQuestions, AIGenerationError } from "@/lib/ai";

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = aiGenerateQuestionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const generated = await generateQuestions({
      topic: parsed.data.topic,
      count: parsed.data.count,
      types: parsed.data.types,
      difficulty: parsed.data.difficulty,
    });

    // نتحقق من قواعد العمل نفسها المستخدمة عند الحفظ اليدوي، ونستبعد بهدوء
    // أي سؤال ما التزمش بالقواعد بدل ما نُفشل الطلب كله بسؤال واحد سيء.
    const validQuestions = generated.filter((q) => {
      const error = validateQuestionBusinessRules({
        subjectId: parsed.data.subjectId,
        unitId: parsed.data.unitId ?? null,
        lessonId: null,
        type: q.type,
        text: q.text,
        codeSnippet: q.codeSnippet ?? null,
        difficulty: q.difficulty,
        points: q.points,
        explanation: q.explanation ?? null,
        options: q.options,
      });
      return error === null;
    });

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: "لم ينجح توليد أي سؤال صالح، حاول تعديل الموضوع أو إعادة المحاولة." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      questions: validQuestions,
      skippedCount: generated.length - validQuestions.length,
    });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
