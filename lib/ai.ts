import { z } from "zod";

// نستخدم Google Gemini بدل Anthropic API هنا تحديدًا لأن Gemini يوفّر مستوى
// مجاني دائم (بدون بطاقة بنكية) بحد يومي كافٍ لاستخدام معلّم واحد. باقي
// المنصة لا علاقة له بهذا الاختيار.
// موديل Gemini الأساسي والبدائل مُعرّفان أدناه ضمن FALLBACK_MODELS.

// preprocess بسيط بيقبل الاختلافات الشكلية البسيطة اللي الموديل ممكن يرجّعها
// (مسافات زيادة أو حروف كبيرة/صغيرة) بدل ما يفشل التحقق كله.
const normalizeEnumInput = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v);

const typeEnum = z.enum(["mcq", "true_false", "multiple_answer", "ordering", "code_output", "essay"]);
const difficultyEnum = z.enum(["easy", "medium", "hard"]);

const generatedOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.coerce.boolean(),
});

const generatedQuestionSchema = z.object({
  type: z.preprocess(normalizeEnumInput, typeEnum),
  text: z.string().min(1),
  codeSnippet: z.string().nullable().optional(),
  difficulty: z.preprocess(normalizeEnumInput, difficultyEnum),
  points: z.coerce.number().int().min(1).max(10),
  explanation: z.string().nullable().optional(),
  // بعض الموديلات بتسيب options فاضي تمامًا (undefined) بدل [] لأسئلة essay
  // رغم تعليمات الـ prompt، فبنعتبرها [] افتراضيًا بدل ما نرفض السؤال كله.
  options: z.array(generatedOptionSchema).max(8).optional().default([]),
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
//
// ملحوظة مهمة (أغسطس 2026): "gemini-2.0-flash" تم إيقافه نهائيًا من جوجل
// في 1 يونيو 2026 (بيرجع 404 دايمًا)، فمُتشال من القائمة. اتحطّت بدل منه
// موديلات "flash-lite" الحالية اللي بتكون غالبًا أقل ازدحامًا من flash
// العادي، وبالتالي بتقلل احتمال ظهور خطأ 503 (High demand) بشكل كبير.
// كل الموديلات دي لسه على المستوى المجاني تمامًا بدون أي بطاقة بنكية.
const FALLBACK_MODELS = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-lite-latest", // اسم مستعار (alias) دائم من جوجل لأحدث إصدار Flash-Lite (حاليًا Gemini 3.1 Flash-Lite)
      "gemini-flash-latest", // اسم مستعار دائم لأحدث إصدار Flash (حاليًا Gemini 3.5 Flash)
    ].filter((m): m is string => Boolean(m))
  )
);

export class AIGenerationError extends Error {}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// مهلة إجمالية صارمة لكل محاولات إعادة الاتصال مجتمعة. لازم تفضل أقل بأمان
// من maxDuration بتاع الـ route (45 ثانية) عشان نضمن إن الكود يرجّع رسالة
// خطأ واضحة بنفسه *قبل* ما Vercel يقفل الطلب بالقوة برد 504 فاضي (اللي
// بيظهر للمستخدم كـ "تعذّر توليد الأسئلة" من غير أي تفاصيل).
const TOTAL_BUDGET_MS = 35000;
// أقصى وقت للمحاولة الواحدة، عشان لو Google نفسها معلّقة (مش بترجع 503
// بسرعة) الكود ميستنّاش عليها للأبد ويضيّع الميزانية كلها في محاولة واحدة.
const PER_CALL_TIMEOUT_MS = 9000;

async function callGeminiOnce(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string) {
  const attemptsPerModel = 2;
  const startedAt = Date.now();
  const remainingBudget = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);

  let lastErr: { status: number; body: string } | null = null;
  let timedOut = false;

  outer: for (const model of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      const budget = remainingBudget();
      if (budget < 1500) {
        // مفيش وقت كافٍ لمحاولة تانية بمعنى الكلمة - نوقف هنا ونرجّع خطأ
        // واضح دلوقتي بدل ما نسيب Vercel يقطع الاتصال من غير أي رد.
        timedOut = true;
        break outer;
      }

      let res: Response;
      try {
        res = await callGeminiOnce(model, apiKey, systemPrompt, userPrompt, Math.min(PER_CALL_TIMEOUT_MS, budget));
      } catch (e) {
        // فشل الشبكة أو انتهت مهلة المحاولة نفسها (AbortError) - نعتبره
        // قابل لإعادة المحاولة ونكمل للموديل/المحاولة التالية.
        lastErr = { status: 0, body: e instanceof Error ? e.message : String(e) };
        if (remainingBudget() < 1000) {
          timedOut = true;
          break outer;
        }
        continue;
      }

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
      if (!isRetryable) break; // خطأ غير متعلق بالازدحام (زي 404 لموديل شُطب)، جرب الموديل التالي فورًا من غير انتظار

      if (attempt < attemptsPerModel && remainingBudget() > 1500) {
        const backoff = 500 * 2 ** (attempt - 1); // 500ms, 1000ms
        const jitter = Math.random() * 300;
        await sleep(Math.min(backoff + jitter, remainingBudget() - 500));
      }
    }
    // انتقل للموديل التالي في القائمة
  }

  console.error("[ai] All Gemini attempts failed.", { timedOut, lastErr, elapsedMs: Date.now() - startedAt });

  if (timedOut) {
    throw new AIGenerationError(
      "خدمة Gemini بطيئة جدًا في الرد حاليًا على كل الموديلات المتاحة (انتهت مهلة المحاولة الداخلية). برجاء المحاولة بعد دقيقة."
    );
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

  // لو Gemini رفض الرد لأسباب سلامة المحتوى أو انتهى بسبب حد التوكنز، مفيش
  // "candidates" أصلًا أو مفيهاش نص - نديله رسالة واضحة بدل "شكل غير متوقع".
  const finishReason: string | undefined = data?.candidates?.[0]?.finishReason;
  const blockReason: string | undefined = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AIGenerationError(
      `تم رفض الطلب من فلاتر السلامة في Gemini (${blockReason}). جرّب تُعدّل صياغة الموضوع.`
    );
  }

  const rawText: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("\n") ?? "";

  if (!rawText.trim()) {
    throw new AIGenerationError(
      finishReason === "MAX_TOKENS"
        ? "رد النموذج اتقطع لأنه وصل لحد التوكنز المسموح به. قلّل عدد الأسئلة المطلوبة وحاول تاني."
        : "رد فارغ من خدمة الذكاء الاصطناعي، حاول مرة أخرى."
    );
  }

  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    console.error("[ai] JSON.parse failed. Raw model output:", cleaned.slice(0, 2000));
    throw new AIGenerationError("رد الذكاء الاصطناعي لم يكن بصيغة JSON صالحة، حاول مرة أخرى.");
  }

  const questionsArray = (parsedJson as { questions?: unknown })?.questions;
  if (!Array.isArray(questionsArray)) {
    console.error("[ai] Response has no 'questions' array. Raw model output:", cleaned.slice(0, 2000));
    throw new AIGenerationError("شكل بيانات الأسئلة الناتجة غير متوقع، حاول مرة أخرى.");
  }

  // نتحقق من كل سؤال على حدة بدل ما نرفض الدفعة كلها لسبب سؤال واحد غلط
  // الشكل - نفس فلسفة الفلترة الهادئة المطبّقة أصلًا بعدها لقواعد العمل.
  const validQuestions: GeneratedQuestion[] = [];
  for (const item of questionsArray) {
    const result = generatedQuestionSchema.safeParse(item);
    if (result.success) {
      validQuestions.push(result.data);
    } else {
      console.error("[ai] Skipped one malformed question:", result.error.flatten(), item);
    }
  }

  if (validQuestions.length === 0) {
    throw new AIGenerationError("شكل بيانات الأسئلة الناتجة غير متوقع، حاول مرة أخرى.");
  }

  return validQuestions;
}
