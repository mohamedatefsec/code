type OptionForGrading = { id: string; text: string; isCorrect: boolean; order: number };

export type GradableQuestion = {
  type: "mcq" | "true_false" | "multiple_answer" | "ordering" | "code_output" | "essay";
  points: number;
  options: OptionForGrading[];
};

export type SubmittedAnswer = {
  selectedOptionIds?: string[] | null;
  textAnswer?: string | null;
};

/**
 * تصحيح تلقائي بمنطق "الكل أو لا شيء" لكل سؤال (بدون درجات جزئية) - أبسط
 * وأكثر قابلية للفهم من نظام درجات جزئية معقّد.
 * الأسئلة المقالية (essay) الاستثناء الوحيد: لا يمكن تصحيحها آليًا إطلاقًا،
 * فتُرجَع isCorrect: null لتعني "بانتظار تصحيح المدرّس يدويًا".
 */
export function gradeAnswer(
  question: GradableQuestion,
  answer: SubmittedAnswer
): { isCorrect: boolean | null; pointsEarned: number } {
  let isCorrect = false;

  switch (question.type) {
    case "mcq":
    case "true_false": {
      const selected = answer.selectedOptionIds ?? [];
      const correctOption = question.options.find((o) => o.isCorrect);
      isCorrect = selected.length === 1 && !!correctOption && selected[0] === correctOption.id;
      break;
    }

    case "multiple_answer": {
      const selected = new Set(answer.selectedOptionIds ?? []);
      const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
      isCorrect =
        selected.size === correctIds.size && [...selected].every((id) => correctIds.has(id));
      break;
    }

    case "ordering": {
      const selected = answer.selectedOptionIds ?? [];
      const correctSequence = [...question.options]
        .sort((a, b) => a.order - b.order)
        .map((o) => o.id);
      isCorrect =
        selected.length === correctSequence.length &&
        selected.every((id, i) => id === correctSequence[i]);
      break;
    }

    case "code_output": {
      const expected = question.options[0]?.text?.trim() ?? "";
      const submitted = (answer.textAnswer ?? "").trim();
      isCorrect = expected.length > 0 && submitted === expected;
      break;
    }

    case "essay": {
      // لا تصحيح آلي إطلاقًا - بانتظار مراجعة المدرّس يدويًا
      return { isCorrect: null, pointsEarned: 0 };
    }
  }

  return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
}
