import {
  CAMERA_TEST_TERMS,
  DIALOGUE_CUT_LABELS,
  HIGH_MICRO_BEAT_COUNT,
  MIN_MICRO_BEAT_COUNT,
  type DialogueCutTag,
  type FindingSeverity,
  type MicroBeat,
  type SceneLabFields,
} from "@/lib/scene-lab/model";
import { learningLinkForRule } from "@/lib/scene-lab/learning-links";

export type RuleFindingDraft = {
  ruleId: string;
  severity: FindingSeverity;
  evidenceLocation: string;
  explanation: string;
  atlasConceptId: string;
  lessonId: string;
  exerciseId: string;
  bookId: string;
  chapterSlug: string;
  sectionId: string | null;
  headingId: string | null;
  sourceLabel: string;
  eli5Topic: string;
  dialogueCutTag: DialogueCutTag | null;
};

export type SceneReviewInput = {
  heading: string;
  beatId: string | null;
  summary: string;
  location: string;
  fields: SceneLabFields;
  microBeats: MicroBeat[];
  dialogueCutTags?: DialogueCutTag[];
};

function blank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

function linkedFinding(
  ruleId: string,
  partial: {
    severity: FindingSeverity;
    evidenceLocation: string;
    explanation: string;
    dialogueCutTag?: DialogueCutTag | null;
  },
): RuleFindingDraft {
  const link = learningLinkForRule(ruleId);
  return {
    ruleId,
    severity: partial.severity,
    evidenceLocation: partial.evidenceLocation,
    explanation: partial.explanation,
    dialogueCutTag: partial.dialogueCutTag ?? null,
    ...link,
  };
}

function scanCameraTerms(text: string): Array<{ term: string; snippet: string }> {
  const lower = text.toLowerCase();
  const hits: Array<{ term: string; snippet: string }> = [];
  for (const term of CAMERA_TEST_TERMS) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(term, from);
      if (index < 0) break;
      const start = Math.max(0, index - 24);
      const end = Math.min(text.length, index + term.length + 24);
      hits.push({
        term,
        snippet: text.slice(start, end).replace(/\s+/g, " ").trim(),
      });
      from = index + term.length;
    }
  }
  return hits;
}

function longActionParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.split(/\s+/).filter(Boolean).length >= 80);
}

/** Deterministic Scene Lab rules. No overall script score is produced. */
export function runSceneReviewRules(input: SceneReviewInput): RuleFindingDraft[] {
  const findings: RuleFindingDraft[] = [];
  const { fields, microBeats } = input;

  if (blank(fields.povOwner)) {
    findings.push(
      linkedFinding("no-pov-owner", {
        severity: "warning",
        evidenceLocation: "scene.pov_owner",
        explanation: "No POV owner is set. The seven-question card needs a point-of-view character.",
      }),
    );
  }

  if (blank(fields.sceneObjective)) {
    findings.push(
      linkedFinding("no-objective", {
        severity: "warning",
        evidenceLocation: "scene.scene_objective",
        explanation: "No scene objective is set. What does the POV character want in this scene?",
      }),
    );
  }

  if (blank(fields.whyNow)) {
    findings.push(
      linkedFinding("no-why-now", {
        severity: "warning",
        evidenceLocation: "scene.why_now",
        explanation: "No why-now reason is set. Why must this confrontation happen now?",
      }),
    );
  }

  if (blank(fields.obstacle)) {
    findings.push(
      linkedFinding("no-obstacle", {
        severity: "warning",
        evidenceLocation: "scene.obstacle",
        explanation: "No obstacle is set. What resists the objective?",
      }),
    );
  }

  if (blank(fields.turnDescription)) {
    findings.push(
      linkedFinding("no-turn", {
        severity: "warning",
        evidenceLocation: "scene.turn_description",
        explanation: "No turn is described. Every scene needs an irreversible change.",
      }),
    );
  }

  if (
    !blank(fields.chargeIn) &&
    !blank(fields.chargeOut) &&
    fields.chargeIn.trim().toLowerCase() === fields.chargeOut.trim().toLowerCase()
  ) {
    findings.push(
      linkedFinding("charge-in-equals-charge-out", {
        severity: "blocker",
        evidenceLocation: "scene.charge_in / scene.charge_out",
        explanation: `Charge in and charge out are the same (“${fields.chargeIn.trim()}”). Same-to-same is not a turn.`,
      }),
    );
  }

  if (blank(fields.object)) {
    findings.push(
      linkedFinding("no-object", {
        severity: "warning",
        evidenceLocation: "scene.object",
        explanation: "No object is chosen. Pick something concrete the camera can hold on.",
      }),
    );
  }

  if (blank(fields.lightSource)) {
    findings.push(
      linkedFinding("no-light-source", {
        severity: "warning",
        evidenceLocation: "scene.light_source",
        explanation: "No light source is set. Light is part of location and mood evidence.",
      }),
    );
  }

  if (microBeats.length < MIN_MICRO_BEAT_COUNT) {
    findings.push(
      linkedFinding("fewer-than-three-micro-beats", {
        severity: "warning",
        evidenceLocation: "micro_beats",
        explanation: `Only ${microBeats.length} micro-beat(s) mapped. Aim for at least ${MIN_MICRO_BEAT_COUNT}.`,
      }),
    );
  }

  if (microBeats.length > HIGH_MICRO_BEAT_COUNT) {
    findings.push(
      linkedFinding("unusually-high-micro-beat-count", {
        severity: "suggestion",
        evidenceLocation: "micro_beats",
        explanation: `${microBeats.length} micro-beats is unusually high (threshold ${HIGH_MICRO_BEAT_COUNT}). Consider compressing.`,
      }),
    );
  }

  if (microBeats.length >= 2) {
    const kinds = new Set(microBeats.map((beat) => beat.loadOrAbsorb));
    if (kinds.size < 2) {
      findings.push(
        linkedFinding("no-load-absorb-variation", {
          severity: "warning",
          evidenceLocation: "micro_beats.load_or_absorb",
          explanation: "All mapped micro-beats share the same Load/Absorb label. Alternate breathing.",
        }),
      );
    }
  }

  const draftText = [fields.longDraft, fields.dialogueNotes, input.summary]
    .filter(Boolean)
    .join("\n\n");
  for (const hit of scanCameraTerms(draftText).slice(0, 12)) {
    findings.push(
      linkedFinding("forbidden-interiority-words", {
        severity: "suggestion",
        evidenceLocation: `draft≈"${hit.snippet}"`,
        explanation: `Camera-test suggestion: “${hit.term}” may be interiority a camera cannot photograph. This is a review suggestion, not an unquestionable law.`,
      }),
    );
  }

  for (const paragraph of longActionParagraphs(fields.longDraft).slice(0, 5)) {
    const snippet = paragraph.slice(0, 80).replace(/\s+/g, " ");
    findings.push(
      linkedFinding("long-action-paragraphs", {
        severity: "suggestion",
        evidenceLocation: `long_draft≈"${snippet}…"`,
        explanation: "This action block is unusually long. Consider breaking it into photographable beats.",
      }),
    );
  }

  if (blank(input.heading)) {
    findings.push(
      linkedFinding("no-scene-heading", {
        severity: "warning",
        evidenceLocation: "scene.heading",
        explanation: "No scene heading is set.",
      }),
    );
  }

  if (!input.beatId) {
    findings.push(
      linkedFinding("no-beat-assignment", {
        severity: "warning",
        evidenceLocation: "scene.beat_id",
        explanation: "This scene is not assigned to a story beat.",
      }),
    );
  }

  if (blank(fields.deletionTestResult)) {
    findings.push(
      linkedFinding("deletion-test-not-completed", {
        severity: "warning",
        evidenceLocation: "scene.deletion_test_result",
        explanation: "Deletion test has not been completed for this scene.",
      }),
    );
  }

  for (const tag of input.dialogueCutTags ?? []) {
    findings.push(
      linkedFinding("dialogue-cut-tag", {
        severity: "suggestion",
        evidenceLocation: "dialogue_cuts",
        explanation: `Dialogue cut tagged: ${DIALOGUE_CUT_LABELS[tag]}. Accept, dismiss, or defer — the software will not rewrite the line.`,
        dialogueCutTag: tag,
      }),
    );
  }

  return findings;
}
