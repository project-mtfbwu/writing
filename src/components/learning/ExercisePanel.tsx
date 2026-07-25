"use client";

import { useMemo, useState } from "react";
import type { Exercise } from "@/types/learning";
import { gradeExercise, type ExerciseResponse } from "@/lib/learning/exercises";
import { ApplyToProject } from "@/components/learning/ApplyToProject";

type ExercisePanelProps = {
  exercise: Exercise;
  onResult: (result: { passed: boolean; feedback: string; response: ExerciseResponse }) => void;
  courseId: string;
  lessonId: string;
  contentVersion: string;
  attemptNumber: number;
};

export function ExercisePanel({
  exercise,
  onResult,
  courseId,
  lessonId,
  contentVersion,
  attemptNumber,
}: ExercisePanelProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState(() => exercise.options.map((option) => option.id));
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<{
    passed: boolean;
    feedback: string;
    response: ExerciseResponse;
  } | null>(null);

  const isMulti = exercise.type === "multi-select" || exercise.type === "compare-bad-better";
  const isOrder = exercise.type === "reorder-beats";
  const isText = exercise.type === "internal-to-visible" || exercise.type === "short-response";

  const shuffledHint = useMemo(() => {
    if (!isOrder) return null;
    return "Use Move up / Move down to set the order.";
  }, [isOrder]);

  function toggleOption(id: string) {
    if (isMulti) {
      setSelected((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
      return;
    }
    setSelected([id]);
  }

  function move(id: string, direction: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item!);
      return copy;
    });
  }

  function submit() {
    let response: ExerciseResponse;
    if (isText) {
      response = { type: "text", text };
    } else if (isOrder) {
      response = { type: "order", optionIds: order };
    } else if (isMulti) {
      response = { type: "options", optionIds: selected };
    } else {
      response = { type: "option", optionId: selected[0] ?? "" };
    }
    const result = gradeExercise(exercise, response);
    setFeedback(result.feedback);
    setPassed(result.passed);
    const payload = { ...result, response };
    setLastResult(payload);
    onResult(payload);
  }

  return (
    <section className="learn-exercise" aria-label="Interactive exercise">
      <p className="learn-exercise__type">{exercise.type}</p>
      <h3>{exercise.prompt}</h3>

      {isText ? (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          placeholder="Write your rewrite…"
        />
      ) : isOrder ? (
        <div>
          <p className="learn-meta">{shuffledHint}</p>
          <ol className="learn-exercise__order">
            {order.map((id) => {
              const option = exercise.options.find((item) => item.id === id);
              if (!option) return null;
              return (
                <li key={id}>
                  <span>{option.label}</span>
                  <span className="learn-exercise__order-actions">
                    <button type="button" onClick={() => move(id, -1)}>
                      Up
                    </button>
                    <button type="button" onClick={() => move(id, 1)}>
                      Down
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <ul className="learn-exercise__options">
          {exercise.options.map((option) => (
            <li key={option.id}>
              <label>
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={exercise.id}
                  checked={selected.includes(option.id)}
                  onChange={() => toggleOption(option.id)}
                />
                <span>{option.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="learn-exercise__submit" onClick={submit}>
        Check answer
      </button>

      {feedback ? (
        <p className={`learn-exercise__feedback ${passed ? "is-pass" : "is-fail"}`} role="status">
          {feedback}
        </p>
      ) : null}

      <ApplyToProject
        exercise={exercise}
        lastResult={lastResult}
        courseId={courseId}
        lessonId={lessonId}
        contentVersion={contentVersion}
        attemptNumber={attemptNumber}
      />
    </section>
  );
}
