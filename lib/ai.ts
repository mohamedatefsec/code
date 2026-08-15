import { z } from "zod";

// نستخدم Google Gemini بدل Anthropic API هنا تحديدًا لأن Gemini يوفّر مستوى
// مجاني دائم (بدون بطاقة بنكية) بحد يومي كافٍ لاستخدام معلّم واحد. باقي
// المنصة لا علاقة له بهذا الاختيار.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const generatedOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const generatedQuestionSchema = z.object({
  type: z.enum(["mcq", "true_false", "multiple_answer", "ordering", "code_output", "essay"]),
  text: z.string().min(1),
  codeSnippet: z.string().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number().int().min(1).max(10),
  explanation: z.string().nullable().optional(),
  options: z.array(generatedOptionSchema).max(8),
});

const generatedResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

const SYSTEM_PROMPT = `أنت مساعد لإنشاء أسئلة تعليمية لمادة البرمجة أو الذكاء الاصطناعي لطلاب المرحلة الثانوية باللغة العربية.

القواعد الإلزامية لكل نوع سؤال (لازم تُتَّبع بالظبط):
- mcq: بالظبط خيار واحد isCorrect=true، والباقي false. 3-5 خيارات.
- true_false: بالظبط خياران ["صح", "خطأ"]، وواحد منهم isCorrect=true فقط.
- multiple_answer: خيار واحد صحيح على الأقل، ممكن أكثر من واحد.
- ordering: كل الخيارات isCorrect=false (غير مستخدم في هذا النوع)، والترتيب الصحيح للعناصر هو ترتيبها في المصفوفة نفسها من الأول للآخر.
- code_output: خيار واحد بالظبط فيه الناتج المتوقع بالظبط، isCorrect=true. استخدم codeSnippet لوضع الكود المطلوب توقع ناتجه.
- essay: مصفوفة options فاضية تمامًا []. سؤال مقالي مفتوح يحتاج تفكير وشرح من الطالب، سيُصحَّح يدويًا.

أعِد الإجابة **فقط** بصيغة JSON صالحة مطابقة تمامًا لهذا الشكل، بدون أي نص إضافي أو Markdown code fences:
{"questions": [{"type": "...", "text": "...", "codeSnippet": null, "difficulty": "...", "points": 1, "explanation": "...", "options": [{"text": "...", "isCorrect": true}]}]}`;

export class AIGenerationError extends Error {}

export async function generateQuestions(params: {
  topic: string;
  count: number;
  types: string[];
  difficulty: "easy" | "medium" | "hard" | "mixed";
}): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "لم يتم إعداد GEMINI_API_KEY في ملف .env - أضف مفتاح Google Gemini API المجاني أولًا."
    );
  }

  const userPrompt = `أنشئ ${params.count} سؤال عن: "${params.topic}".
أنواع الأسئلة المطلوبة: ${params.types.join(", ")}.
مستوى الصعوبة: ${params.difficulty === "mixed" ? "متنوع بين سهل ومتوسط وصعب" : params.difficulty}.
وزّع الأسئلة على الأنواع المطلوبة بالتساوي قدر الإمكان.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new AIGenerationError(
      `فشل الاتصال بخدمة الذكاء الاصطناعي (HTTP ${res.status}). تأكد من صحة GEMINI_API_KEY. ${errBody.slice(0, 200)}`
    );
  }

  const data = await res.json();
  const rawText: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("\n") ?? "";

  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    throw new AIGenerationError("رد الذكاء الاصطناعي لم يكن بصيغة JSON صالحة، حاول مرة أخرى.");
  }

  const parsed = generatedResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new AIGenerationError("شكل بيانات الأسئلة الناتجة غير متوقع، حاول مرة أخرى.");
  }

  return parsed.data.questions;
}
