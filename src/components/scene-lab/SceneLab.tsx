"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { Beat, Scene } from "@/lib/beats/order";
import {
  DIALOGUE_CUT_LABELS,
  SCENE_LAB_STEPS,
  type DialogueCutTag,
  type FindingStatus,
  type MicroBeat,
} from "@/lib/scene-lab/model";
import {
  deletionTestAction,
  respondToFindingAction,
  runSceneReviewAction,
  updateSceneLabFieldsAction,
  upsertMicroBeatAction,
  deleteMicroBeatAction,
  type SceneReviewFindingView,
} from "@/lib/scene-lab/actions";
import type { DeletionImpact } from "@/lib/scene-lab/deletion";

type Mode = "guided" | "expert";

type SceneLabProps = {
  projectId: string;
  projectTitle: string;
  userId: string;
  beats: Beat[];
  scenes: Scene[];
  initialSceneId: string | null;
  initialMicroBeats: MicroBeat[];
  initialFindings: SceneReviewFindingView[];
};

const DIALOGUE_TAGS = Object.keys(DIALOGUE_CUT_LABELS) as DialogueCutTag[];

export function SceneLab({
  projectId,
  projectTitle,
  userId,
  beats,
  scenes: initialScenes,
  initialSceneId,
  initialMicroBeats,
  initialFindings,
}: SceneLabProps) {
  const [mode, setMode] = useState<Mode>("guided");
  const [stepIndex, setStepIndex] = useState(0);
  const [scenes, setScenes] = useState(initialScenes);
  const [activeId] = useState(
    initialSceneId ?? initialScenes[0]?.id ?? null,
  );
  const [microBeats, setMicroBeats] = useState(initialMicroBeats);
  const [findings, setFindings] = useState(initialFindings);
  const [dialogueTags, setDialogueTags] = useState<DialogueCutTag[]>([]);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = useMemo(
    () => scenes.find((scene) => scene.id === activeId) ?? null,
    [scenes, activeId],
  );
  const step = SCENE_LAB_STEPS[stepIndex]!;

  function patchActive(patch: Partial<Scene>) {
    if (!active) return;
    setScenes((current) =>
      current.map((scene) => (scene.id === active.id ? { ...scene, ...patch } : scene)),
    );
  }

  function save(patch: Parameters<typeof updateSceneLabFieldsAction>[0]["patch"]) {
    if (!active) return;
    const snapshot = scenes;
    startTransition(async () => {
      const result = await updateSceneLabFieldsAction({
        projectId,
        sceneId: active.id,
        patch,
      });
      if (result.error) {
        setScenes(snapshot);
        setError(result.error);
        return;
      }
      if (result.scene) {
        setScenes((current) =>
          current.map((scene) => (scene.id === result.scene!.id ? result.scene! : scene)),
        );
      }
      setMessage(result.message);
      setError(null);
    });
  }

  function runReview() {
    if (!active) return;
    startTransition(async () => {
      const result = await runSceneReviewAction({
        projectId,
        sceneId: active.id,
        mode,
        dialogueCutTags: dialogueTags,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setFindings(result.findings ?? []);
      setMessage(result.message);
      setError(null);
    });
  }

  function respond(findingId: string, status: FindingStatus) {
    startTransition(async () => {
      const result = await respondToFindingAction({
        projectId,
        findingId,
        status,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setFindings((current) =>
        current.map((finding) =>
          finding.id === findingId ? { ...finding, status } : finding,
        ),
      );
      setMessage(result.message);
    });
  }

  function runDeletion() {
    if (!active) return;
    startTransition(async () => {
      const result = await deletionTestAction({ projectId, sceneId: active.id });
      if (result.error) {
        setError(result.error);
        return;
      }
      setImpact(result.impact ?? null);
      if (result.impact) {
        patchActive({
          deletionTestResult: result.impact.emptyMessage ??
            [
              ...result.impact.setupsLost.map((item) => `setup: ${item}`),
              ...result.impact.payoffsWeakened.map((item) => `payoff: ${item}`),
              ...result.impact.characterDecisionsUnsupported.map(
                (item) => `decision: ${item}`,
              ),
              ...result.impact.beatGaps,
            ].join(" | "),
        });
      }
      setMessage(result.message);
    });
  }

  function addMicroBeat() {
    if (!active) return;
    const id = crypto.randomUUID();
    const created: MicroBeat = {
      id,
      projectId,
      sceneId: active.id,
      userId,
      sortOrder: microBeats.length,
      actionTactic: "",
      reactionResistance: "",
      adjustment: "",
      loadOrAbsorb: microBeats.length % 2 === 0 ? "Load" : "Absorb",
      elementRangeStart: null,
      elementRangeEnd: null,
      durationEstimateSeconds: null,
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMicroBeats((current) => [...current, created]);
    startTransition(async () => {
      const result = await upsertMicroBeatAction({
        projectId,
        sceneId: active.id,
        microBeat: created,
      });
      if (result.error) setError(result.error);
      else if (result.microBeat) {
        setMicroBeats((current) =>
          current.map((item) => (item.id === id ? result.microBeat! : item)),
        );
      }
    });
  }

  if (!active) {
    return (
      <p className="atlas-muted">
        No scenes yet. Create one on{" "}
        <Link href={`/projects/${projectId}/structure`}>Structure</Link> first.
      </p>
    );
  }

  const showAll = mode === "expert";

  return (
    <div className="scene-lab">
      <header className="scene-lab__toolbar">
        <p className="atlas-muted">{projectTitle} · Scene Lab</p>
        <div className="scene-lab__modes" role="group" aria-label="Scene Lab mode">
          <button
            type="button"
            aria-pressed={mode === "guided"}
            onClick={() => setMode("guided")}
          >
            Guided wizard
          </button>
          <button
            type="button"
            aria-pressed={mode === "expert"}
            onClick={() => setMode("expert")}
          >
            Expert all-at-once
          </button>
        </div>
        <label>
          Scene
          <select
            value={active.id}
            onChange={(event) => {
              const next = event.target.value;
              window.location.href = `/projects/${projectId}/scene-lab?scene=${next}`;
            }}
          >
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.heading || "Untitled"}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={pending} onClick={runReview}>
          Run rule-based review
        </button>
      </header>

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-ok">{message}</p> : null}
      <p className="scene-lab__disclaimer">
        Findings come from transparent rules. There is no overall script score. Accept,
        dismiss, or defer findings — scene writing is never automatically overwritten.
      </p>

      {mode === "guided" ? (
        <nav className="scene-lab__steps" aria-label="Scene Lab sequence">
          <ol>
            {SCENE_LAB_STEPS.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={index === stepIndex ? "step" : undefined}
                  onClick={() => setStepIndex(index)}
                >
                  {index + 1}. {item.title}
                </button>
              </li>
            ))}
          </ol>
          <p>
            <strong>
              Step {stepIndex + 1}: {step.title}
            </strong>
          </p>
          <p className="atlas-muted">{step.help}</p>
          <div className="scene-lab__step-nav">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={stepIndex >= SCENE_LAB_STEPS.length - 1}
              onClick={() =>
                setStepIndex((value) => Math.min(SCENE_LAB_STEPS.length - 1, value + 1))
              }
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}

      <div className="scene-lab__layout">
        <section className="scene-lab__form" aria-label="Scene Lab fields">
          {(showAll || step.id === "logline") && (
            <Field
              label="Scene logline"
              value={active.summary}
              onChange={(value) => patchActive({ summary: value })}
              onBlur={(value) => save({ summary: value })}
              multiline
            />
          )}

          {(showAll || step.id === "charge") && (
            <>
              <Field
                label="POV owner"
                value={active.povOwner}
                onChange={(value) => patchActive({ povOwner: value })}
                onBlur={(value) => save({ povOwner: value })}
              />
              <Field
                label="Scene objective"
                value={active.sceneObjective}
                onChange={(value) => patchActive({ sceneObjective: value })}
                onBlur={(value) => save({ sceneObjective: value })}
              />
              <Field
                label="Why now"
                value={active.whyNow}
                onChange={(value) => patchActive({ whyNow: value })}
                onBlur={(value) => save({ whyNow: value })}
              />
              <Field
                label="Obstacle"
                value={active.obstacle}
                onChange={(value) => patchActive({ obstacle: value })}
                onBlur={(value) => save({ obstacle: value })}
              />
              <Field
                label="Tactics"
                value={active.tactics}
                onChange={(value) => patchActive({ tactics: value })}
                onBlur={(value) => save({ tactics: value })}
              />
              <Field
                label="Charge in"
                value={active.chargeIn}
                onChange={(value) => patchActive({ chargeIn: value })}
                onBlur={(value) => save({ chargeIn: value })}
              />
              <Field
                label="Charge out"
                value={active.chargeOut}
                onChange={(value) => patchActive({ chargeOut: value })}
                onBlur={(value) => save({ chargeOut: value })}
              />
            </>
          )}

          {(showAll || step.id === "object") && (
            <Field
              label="Object"
              value={active.object}
              onChange={(value) => patchActive({ object: value })}
              onBlur={(value) => save({ object: value })}
            />
          )}

          {(showAll || step.id === "location-light") && (
            <>
              <Field
                label="Location"
                value={active.location}
                onChange={(value) => patchActive({ location: value })}
                onBlur={(value) => save({ location: value })}
              />
              <Field
                label="Light source"
                value={active.lightSource}
                onChange={(value) => patchActive({ lightSource: value })}
                onBlur={(value) => save({ lightSource: value })}
              />
              <Field
                label="Environment"
                value={active.environment}
                onChange={(value) => patchActive({ environment: value })}
                onBlur={(value) => save({ environment: value })}
              />
              <Field
                label="Background life"
                value={active.backgroundLife}
                onChange={(value) => patchActive({ backgroundLife: value })}
                onBlur={(value) => save({ backgroundLife: value })}
              />
              <Field
                label="Register"
                value={active.register}
                onChange={(value) => patchActive({ register: value })}
                onBlur={(value) => save({ register: value })}
              />
            </>
          )}

          {(showAll || step.id === "turn") && (
            <Field
              label="Turn description"
              value={active.turnDescription}
              onChange={(value) => patchActive({ turnDescription: value })}
              onBlur={(value) => save({ turnDescription: value })}
              multiline
            />
          )}

          {(showAll || step.id === "write-long") && (
            <Field
              label="Write it too long"
              value={active.longDraft}
              onChange={(value) => patchActive({ longDraft: value })}
              onBlur={(value) => save({ longDraft: value })}
              multiline
              rows={8}
            />
          )}

          {(showAll || step.id === "delete-speeches") && (
            <Field
              label="First/last speech deletion notes"
              value={active.dialogueNotes}
              onChange={(value) => patchActive({ dialogueNotes: value })}
              onBlur={(value) => save({ dialogueNotes: value })}
              multiline
            />
          )}

          {(showAll || step.id === "dialogue-cuts") && (
            <fieldset className="scene-lab__cuts">
              <legend>Dialogue cut tags</legend>
              <p className="atlas-muted">
                Tag only — never auto-rewrites dialogue.
              </p>
              {DIALOGUE_TAGS.map((tag) => (
                <label key={tag}>
                  <input
                    type="checkbox"
                    checked={dialogueTags.includes(tag)}
                    onChange={(event) => {
                      setDialogueTags((current) =>
                        event.target.checked
                          ? [...current, tag]
                          : current.filter((item) => item !== tag),
                      );
                    }}
                  />
                  {DIALOGUE_CUT_LABELS[tag]}
                </label>
              ))}
            </fieldset>
          )}

          {(showAll || step.id === "camera-test") && (
            <div className="scene-lab__camera">
              <p>
                Camera-test suggestion terms: remembers, knows, realizes, feels,
                symbolizes, seems, has always been. Run review to flag matches in the
                draft — treated as suggestions, not law.
              </p>
              <Field
                label="Heading"
                value={active.heading}
                onChange={(value) => patchActive({ heading: value })}
                onBlur={(value) => save({ heading: value })}
              />
              <label>
                Beat assignment
                <select
                  value={active.beatId ?? ""}
                  onChange={(event) => {
                    const beatId = event.target.value || null;
                    patchActive({ beatId });
                    save({ beatId });
                  }}
                >
                  <option value="">Unassigned</option>
                  {beats.map((beat) => (
                    <option key={beat.id} value={beat.id}>
                      {beat.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {(showAll || step.id === "micro-beats") && (
            <div className="scene-lab__micro">
              <div className="scene-lab__micro-toolbar">
                <h2>Micro-beats</h2>
                <button type="button" onClick={addMicroBeat} disabled={pending}>
                  Add micro-beat
                </button>
              </div>
              {microBeats.map((beat, index) => (
                <article key={beat.id} className="scene-lab__micro-card">
                  <p>
                    #{index + 1} · {beat.loadOrAbsorb}
                  </p>
                  <label>
                    Load / Absorb
                    <select
                      value={beat.loadOrAbsorb}
                      onChange={(event) => {
                        const loadOrAbsorb = event.target.value as "Load" | "Absorb";
                        const next = { ...beat, loadOrAbsorb };
                        setMicroBeats((current) =>
                          current.map((item) => (item.id === beat.id ? next : item)),
                        );
                        startTransition(async () => {
                          await upsertMicroBeatAction({
                            projectId,
                            sceneId: active.id,
                            microBeat: next,
                          });
                        });
                      }}
                    >
                      <option value="Load">Load</option>
                      <option value="Absorb">Absorb</option>
                    </select>
                  </label>
                  <Field
                    label="Action / tactic"
                    value={beat.actionTactic}
                    onChange={(value) =>
                      setMicroBeats((current) =>
                        current.map((item) =>
                          item.id === beat.id ? { ...item, actionTactic: value } : item,
                        ),
                      )
                    }
                    onBlur={(value) => {
                      startTransition(async () => {
                        await upsertMicroBeatAction({
                          projectId,
                          sceneId: active.id,
                          microBeat: { ...beat, actionTactic: value },
                        });
                      });
                    }}
                  />
                  <Field
                    label="Reaction / resistance"
                    value={beat.reactionResistance}
                    onChange={(value) =>
                      setMicroBeats((current) =>
                        current.map((item) =>
                          item.id === beat.id
                            ? { ...item, reactionResistance: value }
                            : item,
                        ),
                      )
                    }
                    onBlur={(value) => {
                      startTransition(async () => {
                        await upsertMicroBeatAction({
                          projectId,
                          sceneId: active.id,
                          microBeat: { ...beat, reactionResistance: value },
                        });
                      });
                    }}
                  />
                  <Field
                    label="Adjustment"
                    value={beat.adjustment}
                    onChange={(value) =>
                      setMicroBeats((current) =>
                        current.map((item) =>
                          item.id === beat.id ? { ...item, adjustment: value } : item,
                        ),
                      )
                    }
                    onBlur={(value) => {
                      startTransition(async () => {
                        await upsertMicroBeatAction({
                          projectId,
                          sceneId: active.id,
                          microBeat: { ...beat, adjustment: value },
                        });
                      });
                    }}
                  />
                  <Field
                    label="Notes"
                    value={beat.notes}
                    onChange={(value) =>
                      setMicroBeats((current) =>
                        current.map((item) =>
                          item.id === beat.id ? { ...item, notes: value } : item,
                        ),
                      )
                    }
                    onBlur={(value) => {
                      startTransition(async () => {
                        await upsertMicroBeatAction({
                          projectId,
                          sceneId: active.id,
                          microBeat: { ...beat, notes: value },
                        });
                      });
                    }}
                    multiline
                  />
                  <label>
                    Duration estimate (seconds)
                    <input
                      type="number"
                      value={beat.durationEstimateSeconds ?? ""}
                      onChange={(event) => {
                        const durationEstimateSeconds = event.target.value
                          ? Number(event.target.value)
                          : null;
                        const next = { ...beat, durationEstimateSeconds };
                        setMicroBeats((current) =>
                          current.map((item) => (item.id === beat.id ? next : item)),
                        );
                      }}
                      onBlur={() => {
                        startTransition(async () => {
                          await upsertMicroBeatAction({
                            projectId,
                            sceneId: active.id,
                            microBeat: beat,
                          });
                        });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMicroBeats((current) =>
                        current.filter((item) => item.id !== beat.id),
                      );
                      startTransition(async () => {
                        await deleteMicroBeatAction({
                          projectId,
                          microBeatId: beat.id,
                        });
                      });
                    }}
                  >
                    Delete micro-beat
                  </button>
                </article>
              ))}
            </div>
          )}

          {(showAll || step.id === "deletion-test") && (
            <div className="scene-lab__deletion">
              <h2>Deletion test</h2>
              <p className="atlas-muted">
                Temporarily removes this scene from structural projection. Only explicit
                links are reported.
              </p>
              <Field
                label="Setups this scene provides (one per line)"
                value={active.setupsProvided}
                onChange={(value) => patchActive({ setupsProvided: value })}
                onBlur={(value) => save({ setupsProvided: value })}
                multiline
              />
              <Field
                label="Payoffs this scene supports"
                value={active.payoffsSupported}
                onChange={(value) => patchActive({ payoffsSupported: value })}
                onBlur={(value) => save({ payoffsSupported: value })}
                multiline
              />
              <Field
                label="Character decisions supported"
                value={active.characterDecisionsSupported}
                onChange={(value) =>
                  patchActive({ characterDecisionsSupported: value })
                }
                onBlur={(value) => save({ characterDecisionsSupported: value })}
                multiline
              />
              <button type="button" disabled={pending} onClick={runDeletion}>
                Run deletion test
              </button>
              {impact ? (
                <div className="scene-lab__impact">
                  <h3>Projection without this scene</h3>
                  <p>
                    Remaining scenes: {impact.projectionWithoutScene.screenplayScenes.length}
                  </p>
                  {impact.emptyMessage ? (
                    <p>
                      <strong>{impact.emptyMessage}</strong> Missing relationship data does
                      not mean the scene is useless.
                    </p>
                  ) : (
                    <ul>
                      {impact.setupsLost.map((item) => (
                        <li key={`s-${item}`}>Setup lost: {item}</li>
                      ))}
                      {impact.payoffsWeakened.map((item) => (
                        <li key={`p-${item}`}>Payoff weakened: {item}</li>
                      ))}
                      {impact.characterDecisionsUnsupported.map((item) => (
                        <li key={`c-${item}`}>Character decision unsupported: {item}</li>
                      ))}
                      {impact.beatGaps.map((item) => (
                        <li key={`b-${item}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                  <p className="atlas-muted">
                    Recorded result: {active.deletionTestResult || "(pending save)"}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <aside className="scene-lab__findings" aria-label="Review findings">
          <h2>Findings</h2>
          <p className="atlas-muted">No fake overall score.</p>
          {findings.length === 0 ? (
            <p className="atlas-muted">Run a review to see rule-based findings.</p>
          ) : (
            <ul>
              {findings.map((finding) => (
                <li key={finding.id} data-severity={finding.severity} data-status={finding.status}>
                  <p>
                    <code>{finding.ruleId}</code> · {finding.severity} · {finding.status}
                  </p>
                  <p>{finding.explanation}</p>
                  <p className="atlas-muted">Evidence: {finding.evidenceLocation}</p>
                  {finding.dialogueCutTag ? (
                    <p>Dialogue tag: {DIALOGUE_CUT_LABELS[finding.dialogueCutTag]}</p>
                  ) : null}
                  <p className="scene-lab__links">
                    {finding.sourceHref ? (
                      <Link href={finding.sourceHref}>{finding.sourceLabel || "Book"}</Link>
                    ) : null}
                    {finding.eli5Topic ? (
                      <span> ELI5: {finding.eli5Topic}</span>
                    ) : null}
                    {finding.lessonHref ? (
                      <Link href={finding.lessonHref}> Lesson</Link>
                    ) : null}
                    {finding.exerciseHref ? (
                      <Link href={finding.exerciseHref}> Exercise</Link>
                    ) : null}
                    <Link href={finding.atlasHref}> Atlas</Link>
                  </p>
                  <div className="scene-lab__finding-actions">
                    <button type="button" onClick={() => respond(finding.id, "accepted")}>
                      Accept
                    </button>
                    <button type="button" onClick={() => respond(finding.id, "dismissed")}>
                      Dismiss
                    </button>
                    <button type="button" onClick={() => respond(finding.id, "deferred")}>
                      Defer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="scene-lab__field">
      {label}
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur(event.target.value)}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur(event.target.value)}
        />
      )}
    </label>
  );
}
