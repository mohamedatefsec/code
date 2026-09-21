import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { gradeAnswer } from "@/lib/grading";
import {
  REVIEW_QUESTION_TYPES,
  type ReviewCardAnswer,
  type ReviewCardData,
  type ReviewQuestionType,
} from "@/lib/review-shared";

// ===== التحقق من مدخلات الأدمن =====

const reviewOptionInputSchema = z.object({
  /// موجود فقط لخيار محفوظ سابقًا - بنستخدمه في التعديل عشان نحافظ على نفس
  /// الـ ID (وبالتالي إجابات الطلاب اللي اختاروه تفضل مرتبطة بيه).
  id: z.string().min(1).optional(),
  text: z.string().trim().min(1, "نص الخيار مطلوب").max(500),
  isCorrect: z.boolean().default(false),
});

export const reviewQuestionSchema = z.object({
  subjectId: z.string().min(1).optional().nullable(),
  type: z.enum(REVIEW_QUESTION_TYPES),
  text: z.string().trim().min(1, "نص السؤال مطلوب").max(2000),
  codeSnippet: z.string().max(5000).optional().nullable(),
  explanation: z.string().max(2000).optional().nullable(),
  status: z.enum(["draft", "published"]).default("published"),
  options: z.array(reviewOptionInputSchema).max(10),
});

export type ReviewQuestionInput = z.infer<typeof reviewQuestionSchema>;

/**
 * قواعد كل نوع (نفس منطق بنك الأسئلة للأنواع الأربعة المدعومة هنا):
 * - mcq: خيارين على الأقل، وإجابة صحيحة واحدة بالظبط
 * - true_false: خياران بالظبط، وواحد صحيح
 * - multiple_answer: خيارين على الأقل، وإجابة صحيحة واحدة على الأقل
 * - code_output: خيار واحد بالظبط (الناتج المتوقع)
 * - essay: بلا خيارات إطلاقًا (تصحيح يدوي بالكامل - الأدمن بيراجع إجابات الطلاب)
 */
export function validateReviewQuestionRules(data: ReviewQuestionInput): string | null {
  const correctCount = data.options.filter((o) => o.isCorrect).length;

  switch (data.type) {
    case "mcq":
      if (data.options.length < 2) return "أضف خيارين على الأقل.";
      if (correctCount !== 1) return "سؤال الاختيار من متعدد يحتاج إجابة صحيحة واحدة بالظبط.";
      return null;
    case "true_false":
      if (data.options.length !== 2) return "سؤال صح/خطأ يحتاج خيارين بالظبط.";
      if (correctCount !== 1) return "سؤال صح/خطأ يحتاج إجابة صحيحة واحدة بالظبط.";
      return null;
    case "multiple_answer":
      if (data.options.length < 2) return "أضف خيارين على الأقل.";
      if (correctCount < 1) return "اختر إجابة صحيحة واحدة على الأقل.";
      return null;
    case "code_output":
      if (data.options.length !== 1) return "سؤال توقع الناتج يحتاج ناتجًا متوقعًا واحدًا فقط.";
      return null;
    case "essay":
      if (data.options.length !== 0) return "السؤال المقالي لا يحتاج أي خيارات.";
      return null;
    default:
      return "نوع السؤال غير مدعوم.";
  }
}

// ===== مدخلات الطالب =====

export const reviewAnswerSchema = z.object({
  selectedOptionIds: z.array(z.string().min(1)).max(10).optional().nullable(),
  textAnswer: z.string().max(5000).optional().nullable(),
});

export type ReviewAnswerInput = z.infer<typeof reviewAnswerSchema>;

type OptionRow = { id: string; text: string; isCorrect: boolean; order: number };
type GradableReview = { type: ReviewQuestionType; options: OptionRow[] };

export function isReviewType(type: string): type is ReviewQuestionType {
  return (REVIEW_QUESTION_TYPES as readonly string[]).includes(type);
}

/// Prisma بيرجّع أعمدة Json بنوع عام؛ بنحوّله لمصفوفة نصوص بأمان.
export function asStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/// توحيد أسطر الناتج (\r\n → \n) قبل المقارنة، عشان ناتج متعدد الأسطر ما يتقيّمش
/// غلط بسبب اختلاف نظام التشغيل/المتصفح.
function normalizeOutput(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

/**
 * يتحقق إن شكل إجابة الطالب مناسب لنوع السؤال (وإن كل خيار مختار تابع فعلًا
 * لهذا السؤال). يرجّع نص الخطأ أو null لو سليمة.
 */
export function validateReviewAnswerInput(
  question: GradableReview,
  input: ReviewAnswerInput
): string | null {
  if (question.type === "essay") {
    if (!input.textAnswer || input.textAnswer.trim().length === 0) return "اكتب إجابتك أولًا.";
    return null;
  }

  if (question.type === "code_output") {
    if (!input.textAnswer || normalizeOutput(input.textAnswer).length === 0) {
      return "اكتب ناتج الكود أولًا.";
    }
    if (input.textAnswer.length > 1000) return "الإجابة طويلة جدًا.";
    return null;
  }

  const selected = input.selectedOptionIds ?? [];
  if (new Set(selected).size !== selected.length) return "اختيارات غير صالحة.";

  const validIds = new Set(question.options.map((o) => o.id));
  if (!selected.every((id) => validIds.has(id))) return "اختيارات غير صالحة.";

  if (question.type === "multiple_answer") {
    if (selected.length < 1) return "اختر إجابة واحدة على الأقل.";
  } else if (selected.length !== 1) {
    return "اختر إجابة واحدة.";
  }
  return null;
}

/// تصحيح آلي بنفس منطق الاختبارات (lib/grading.ts) - صح أو خطأ فقط، بلا درجات.
/// السؤال المقالي مالوش تصحيح آلي: بيرجّع null = "بانتظار مراجعة المدرّس".
export function gradeReviewAnswer(
  question: GradableReview,
  answer: { selectedOptionIds?: string[] | null; textAnswer?: string | null }
): boolean | null {
  if (question.type === "essay") return null;

  const options =
    question.type === "code_output"
      ? question.options.map((o) => ({ ...o, text: normalizeOutput(o.text) }))
      : question.options;

  const { isCorrect } = gradeAnswer(
    { type: question.type, points: 1, options },
    {
      selectedOptionIds: answer.selectedOptionIds ?? null,
      textAnswer: answer.textAnswer != null ? normalizeOutput(answer.textAnswer) : null,
    }
  );
  return isCorrect === true;
}

/// الجزء اللي بيتكشف للطالب بعد ما يجاوب: الإجابة الصحيحة + الشرح.
export function buildRevealedAnswer(
  question: GradableReview & { explanation: string | null },
  stored: { selectedOptionIds: string[]; textAnswer: string | null; isCorrect: boolean | null }
): ReviewCardAnswer {
  const isCode = question.type === "code_output";
  const noOptions = isCode || question.type === "essay";
  return {
    selectedOptionIds: stored.selectedOptionIds,
    textAnswer: stored.textAnswer,
    isCorrect: stored.isCorrect,
    correctOptionIds: noOptions ? [] : question.options.filter((o) => o.isCorrect).map((o) => o.id),
    expectedOutput: isCode ? question.options[0]?.text ?? null : null,
    explanation: question.explanation?.trim() || null,
  };
}

/**
 * يحوّل سؤالًا من قاعدة البيانات إلى الشكل الآمن اللي يوصل لمتصفح الطالب.
 * القاعدة الأساسية: أي سؤال لسه ما اتحلّش لا يخرج منه isCorrect ولا الشرح ولا
 * (في code_output) الخيارات نفسها لأنها هي الناتج المتوقع.
 */
export function toStudentReviewCard(
  q: {
    id: string;
    type: string;
    text: string;
    codeSnippet: string | null;
    explanation: string | null;
    subject: { name: string } | null;
    options: OptionRow[];
  },
  answerRow: {
    selectedOptionIds: Prisma.JsonValue | null;
    textAnswer: string | null;
    isCorrect: boolean | null;
  } | null
): ReviewCardData | null {
  if (!isReviewType(q.type)) return null;
  const type = q.type;

  const sortedOptions = [...q.options].sort((a, b) => a.order - b.order);

  const answer = answerRow
    ? buildRevealedAnswer(
        { type, options: sortedOptions, explanation: q.explanation },
        {
          selectedOptionIds: asStringArray(answerRow.selectedOptionIds),
          textAnswer: answerRow.textAnswer,
          isCorrect: answerRow.isCorrect,
        }
      )
    : null;

  return {
    id: q.id,
    type,
    text: q.text,
    codeSnippet: q.codeSnippet?.trim() ? q.codeSnippet : null,
    subjectName: q.subject?.name ?? null,
    options:
      type === "code_output" || type === "essay"
        ? []
        : sortedOptions.map((o) => ({ id: o.id, text: o.text })),
    answer,
  };
}
