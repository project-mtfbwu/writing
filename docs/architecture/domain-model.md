# Domain model

## Content domain

| Entity | Description |
|---|---|
| **Book** | Readable product unit assembled from source documents |
| **SourceDocument** | One Markdown file under `content/source/` |
| **Chapter** | Module / numbered chapter within a book |
| **Section** | Major heading within a chapter |
| **ContentBlock** | Atomic typed unit (prose, formula, callout, …) |
| **Callout** | Sidebar / Secret Sauce / note / warning block |
| **Concept** | Named idea extracted for Atlas (e.g. Load/Absorb, seven-question scene card) |
| **Relationship** | Edge between concepts or between concept and evidence |
| **EvidenceLabel** | E1–E5 metadata on claims |
| **Exercise** | Practice prompt attached to a lesson/module |
| **Example** | Worked or contrastive example (bad vs better) |
| **Reference** | Citation, reading-list entry, or indexed reference item |

## Learning domain

| Entity | Description |
|---|---|
| **Course** | Ordered curriculum projection over content |
| **Track** | Parallel syllabus track (A–F) or learning path |
| **Module** | Curriculum module (maps to content chapters) |
| **Lesson** | Learnable unit (often one section or exercise cluster) |
| **ExerciseAttempt** | User response to an exercise |
| **Progress** | Position / completion state in a course |
| **Completion** | Lesson or module completion record |
| **LessonNote** | Private learner note on a lesson |

## Writing domain

| Entity | Description |
|---|---|
| **User** | Account identity (deferred auth) |
| **Project** | Screenplay / story workspace |
| **Premise** | Logline + controlling idea |
| **Character** | Want / Need / Wound / Lie / Arc bible entry |
| **Draft** | Versioned manuscript blob |
| **Beat** | Story beat on the board |
| **Scene** | Scene card / scene document |
| **ScreenplayElement** | Slugline, action, character, dialogue, parenthetical, transition |
| **Version** | Immutable snapshot of a draft or scene |

## Reader domain

| Entity | Description |
|---|---|
| **ReadingPosition** | Book/chapter/block cursor |
| **ReadingDepth** | How thoroughly a section was engaged |
| **Bookmark** | Saved location |
| **Highlight** | Selected span + optional tag |
| **PrivateNote** | Reader-owned annotation |

## Review domain

| Entity | Description |
|---|---|
| **Rule** | Testable craft rule (camera test, deletion test, four cuts, …) |
| **ReviewRun** | Execution of rules against a scene/draft |
| **Finding** | One rule violation or suggestion |
| **FindingStatus** | open / accepted / dismissed / fixed |
| **RewritePass** | Structure / character / dialogue / image / polish pass record |

## Persistence principle

- **Content**: files (`content/source` + generated indexes).
- **User data** (learning progress, reader state, projects, review runs): application database or local store later — not duplicated into Markdown.
- See ADR 0002.
