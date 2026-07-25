import { z } from "zod";

export const CONTENT_VERSION = "2026-07-25.syllabus+session";

export const TrackKindSchema = z.enum([
  "audience",
  "story",
  "architecture",
  "character",
  "scene-craft",
  "language",
  "script-to-cut",
]);
export type TrackKind = z.infer<typeof TrackKindSchema>;

export const PassIdSchema = z.enum(["pass-1", "pass-2", "pass-3", "pass-4"]);
export type PassId = z.infer<typeof PassIdSchema>;

export const LessonCadenceSchema = z.enum(["learn-once", "repeat-every-draft"]);
export type LessonCadence = z.infer<typeof LessonCadenceSchema>;

export const LessonStepKindSchema = z.enum([
  "see",
  "notice",
  "fix",
  "feedback",
  "apply",
  "save",
  "retest",
]);
export type LessonStepKind = z.infer<typeof LessonStepKindSchema>;

export const ExerciseTypeSchema = z.enum([
  "multiple-choice",
  "multi-select",
  "identify-turn",
  "reorder-beats",
  "classify-charge",
  "internal-to-visible",
  "dialogue-cut",
  "short-response",
  "compare-bad-better",
  "load-absorb",
]);
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;

export const SourceRefSchema = z.object({
  bookId: z.string().min(1),
  chapterSlug: z.string().min(1),
  sectionHeadingId: z.string().nullable().optional(),
  label: z.string().min(1),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const LessonStepSchema = z.object({
  id: z.string().min(1),
  kind: LessonStepKindSchema,
  title: z.string().min(1),
  prompt: z.string().min(1),
  exerciseId: z.string().nullable().optional(),
});
export type LessonStep = z.infer<typeof LessonStepSchema>;

export const ExerciseOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
export type ExerciseOption = z.infer<typeof ExerciseOptionSchema>;

export const ExerciseSchema = z.object({
  id: z.string().min(1),
  type: ExerciseTypeSchema,
  prompt: z.string().min(1),
  options: z.array(ExerciseOptionSchema).default([]),
  /** Ordered option ids for reorder exercises */
  correctOrder: z.array(z.string()).optional(),
  /** Correct option id(s) */
  correctOptionIds: z.array(z.string()).default([]),
  /** Keywords / phrases for short written responses (case-insensitive) */
  acceptedKeywords: z.array(z.string()).default([]),
  /** Min keyword hits required */
  minKeywordHits: z.number().int().nonnegative().default(1),
  explanation: z.string().min(1),
  applyTarget: z.object({
    entity: z.string().min(1),
    description: z.string().min(1),
  }),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const LessonSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  trackId: z.string().min(1),
  moduleId: z.string().min(1),
  passId: PassIdSchema,
  cadence: LessonCadenceSchema,
  availableFromPass: PassIdSchema.default("pass-1"),
  evidenceLabels: z.array(z.enum(["E1", "E2", "E3", "E4", "E5"])).default([]),
  sourceRefs: z.array(SourceRefSchema).min(1),
  steps: z.array(LessonStepSchema).min(1),
  exerciseIds: z.array(z.string()).min(1),
  video: z.object({
    placeholderUrl: z.string().url().or(z.literal("")),
    transcript: z.string().min(1),
    markers: z.array(
      z.object({
        id: z.string().min(1),
        atSeconds: z.number().nonnegative(),
        label: z.string().min(1),
      }),
    ),
  }),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  trackId: z.string().min(1),
  lessonIds: z.array(z.string()).min(1),
});
export type Module = z.infer<typeof ModuleSchema>;

export const TrackSchema = z.object({
  id: z.string().min(1),
  kind: TrackKindSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  isReference: z.boolean().default(false),
  order: z.number().int().nonnegative(),
  moduleIds: z.array(z.string()),
});
export type Track = z.infer<typeof TrackSchema>;

export const CourseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  contentVersion: z.string().min(1),
  passLabels: z.record(PassIdSchema, z.string()),
  trackIds: z.array(z.string()).min(1),
  moduleIds: z.array(z.string()).min(1),
  lessonIds: z.array(z.string()).min(1),
});
export type Course = z.infer<typeof CourseSchema>;

export const CurriculumSchema = z.object({
  courses: z.array(CourseSchema),
  tracks: z.array(TrackSchema),
  modules: z.array(ModuleSchema),
  lessons: z.array(LessonSchema),
  exercises: z.array(ExerciseSchema),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;
/** Repository data may omit Zod defaults; `loadCurriculum` applies them. */
export type CurriculumInput = z.input<typeof CurriculumSchema>;

export const ExerciseAttemptSchema = z.object({
  id: z.string().min(1),
  contentVersion: z.string().min(1),
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  exerciseId: z.string().min(1),
  response: z.unknown(),
  passed: z.boolean(),
  feedback: z.string(),
  attemptNumber: z.number().int().positive(),
  createdAt: z.string().min(1),
});
export type ExerciseAttempt = z.infer<typeof ExerciseAttemptSchema>;

export const LessonProgressSchema = z.object({
  lessonId: z.string().min(1),
  contentVersion: z.string().min(1),
  courseId: z.string().min(1),
  completedExerciseIds: z.array(z.string()).default([]),
  completedStepIds: z.array(z.string()).default([]),
  videoPositionSeconds: z.number().nonnegative().default(0),
  videoCompleted: z.boolean().default(false),
  completionCount: z.number().int().nonnegative().default(0),
  completedAt: z.string().nullable().default(null),
  updatedAt: z.string().min(1),
});
export type LessonProgress = z.infer<typeof LessonProgressSchema>;

export const LearningProgressStateSchema = z.object({
  contentVersion: z.string().min(1),
  lessons: z.array(LessonProgressSchema).default([]),
  attempts: z.array(ExerciseAttemptSchema).default([]),
  playheadLessonId: z.string().nullable().default(null),
});
export type LearningProgressState = z.infer<typeof LearningProgressStateSchema>;
