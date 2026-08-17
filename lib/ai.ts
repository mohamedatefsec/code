import { z } from "zod";

// نستخدم Google Gemini بدل Anthropic API هنا تحديدًا لأن Gemini يوفّر مستوى
// مجاني دائم (بدون بطاقة بنكية) بحد يومي كافٍ لاستخدام معلّم واحد. باقي
// المنصة لا علاقة له بهذا الاختيار.
// موديل Gemini الأساسي والبدائل مُعرّفان أدناه ضمن FALLBACK_MODELS.

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

// ترتيب تجربة الموديلات: لو الأول مزدحم أو غير متاح، نجرب اللي بعده تلقائيًا.
// المستخدم يقدر يتحكم في الموديل الأساسي عبر متغير البيئة GEMINI_MODEL،
// وباقي القائمة بتضل fallback ثابت بغض النظر عن الإعداد.
const FALLBACK_MODELS = Array.from(
  new Set([
    process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ])
);

export class AIGenerationError extends Error {}

async function callGeminiOnce(model: string, apiKey: string, systemPrompt: string, userPrompt: string) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
        },
      }),
    }
  );
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string) {
  const attemptsPerModel = 2;
  let lastErr: { status: number; body: string } | null = null;

  for (const model of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      const res = await callGeminiOnce(model, apiKey, systemPrompt, userPrompt);
      if (res.ok) return res;

      const errBody = await res.text().catch(() => "");
      lastErr = { status: res.status, body: errBody };

      // مفتاح غلط: فشل نهائي فورًا، مفيش داعي نجرب موديلات تانية
      if (res.status === 401 || res.status === 403) {
        throw new AIGenerationError(
          "فشل الاتصال بخدمة الذكاء الاصطناعي: مفتاح GEMINI_API_KEY غير صحيح أو غير مفعّل."
        );
      }

      const isRetryable = res.status === 503 || res.status === 429;
      if (!isRetryable) break; // خطأ غير متعلق بالازدحام، جرب الموديل التالي فورًا من غير انتظار

      if (attempt < attemptsPerModel) {
        await new Promise((r) => setTimeout(r, attempt * 1200));
      }
    }
    // انتقل للموديل التالي في القائمة
  }

  if (lastErr?.status === 429) {
    throw new AIGenerationError(
      "تم تجاوز الحد المسموح به من الطلبات لخدمة Gemini المجانية على كل الموديلات المتاحة. انتظر دقيقة وحاول مرة أخرى."
    );
  }
  if (lastErr?.status === 503) {
    throw new AIGenerationError(
      "خدمة Gemini مزدحمة حاليًا من جوجل نفسها على كل الموديلات البديلة (وليست مشكلة في مفتاحك). برجاء المحاولة بعد دقائق قليلة."
    );
  }
  throw new AIGenerationError(
    `فشل الاتصال بخدمة الذكاء الاصطناعي (HTTP ${lastErr?.status}). ${lastErr?.body.slice(0, 200) ?? ""}`
  );
}

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

  const res = await callGemini(apiKey, SYSTEM_PROMPT, userPrompt);

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
