import type { Exercise } from "@/types/learning";

export type ExerciseResponse =
  | { type: "option"; optionId: string }
  | { type: "options"; optionIds: string[] }
  | { type: "order"; optionIds: string[] }
  | { type: "text"; text: string };

export type ExerciseResult = {
  passed: boolean;
  feedback: string;
};

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function keywordHits(text: string, keywords: string[]): number {
  const normalized = text.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
}

export function gradeExercise(exercise: Exercise, response: ExerciseResponse): ExerciseResult {
  switch (exercise.type) {
    case "multiple-choice":
    case "identify-turn":
    case "classify-charge":
    case "dialogue-cut":
    case "load-absorb": {
      if (response.type !== "option") {
        return { passed: false, feedback: "Choose one option." };
      }
      const passed = exercise.correctOptionIds.includes(response.optionId);
      return {
        passed,
        feedback: passed
          ? `Correct. ${exercise.explanation}`
          : `Not yet. ${exercise.explanation}`,
      };
    }
    case "multi-select":
    case "compare-bad-better": {
      if (response.type !== "options") {
        return { passed: false, feedback: "Select all that apply." };
      }
      const passed = sameSet(response.optionIds, exercise.correctOptionIds);
      return {
        passed,
        feedback: passed
          ? `Correct. ${exercise.explanation}`
          : `Not yet. ${exercise.explanation}`,
      };
    }
    case "reorder-beats": {
      if (response.type !== "order") {
        return { passed: false, feedback: "Reorder the beats." };
      }
      const expected = exercise.correctOrder ?? [];
      const passed = sameOrder(response.optionIds, expected);
      return {
        passed,
        feedback: passed
          ? `Correct order. ${exercise.explanation}`
          : `Order is off. ${exercise.explanation}`,
      };
    }
    case "internal-to-visible":
    case "short-response": {
      if (response.type !== "text" || !response.text.trim()) {
        return { passed: false, feedback: "Write a short response." };
      }
      const hits = keywordHits(response.text, exercise.acceptedKeywords);
      const passed = hits >= exercise.minKeywordHits;
      return {
        passed,
        feedback: passed
          ? `Strong enough. ${exercise.explanation}`
          : `Needs a more filmable behaviour/object. ${exercise.explanation}`,
      };
    }
    default: {
      return { passed: false, feedback: "Unknown exercise type." };
    }
  }
}

export function isLessonComplete(input: {
  requiredExerciseIds: string[];
  completedExerciseIds: string[];
  videoCompleted: boolean;
}): boolean {
  // Video end alone never completes a lesson.
  void input.videoCompleted;
  return input.requiredExerciseIds.every((id) => input.completedExerciseIds.includes(id));
}
