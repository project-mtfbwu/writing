import path from "node:path";
import { existsSync } from "node:fs";
import { EvidenceLabelSchema, type ContentManifest, type ParseWarning } from "@/types/content";
import { SOURCE_ROOT_RELATIVE } from "@/lib/content/parse";

export type ValidationIssue = ParseWarning & {
  severity: "error" | "warning";
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

const REQUIRED_SOURCES = [
  "screenwriting-syllabus.md",
  "complete-session-script-to-cut.md",
] as const;

export function validateContentManifest(
  manifest: ContentManifest,
  repoRoot: string,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const pushError = (issue: Omit<ValidationIssue, "severity">) => {
    errors.push({ ...issue, severity: "error" });
  };
  const pushWarning = (issue: Omit<ValidationIssue, "severity">) => {
    warnings.push({ ...issue, severity: "warning" });
  };

  // Missing required source files
  for (const fileName of REQUIRED_SOURCES) {
    const absolute = path.join(repoRoot, SOURCE_ROOT_RELATIVE, fileName);
    if (!existsSync(absolute)) {
      pushError({
        code: "missing-source-file",
        message: `Missing required source file: ${SOURCE_ROOT_RELATIVE}/${fileName}`,
      });
    }
  }

  if (manifest.documents.length === 0) {
    pushError({
      code: "no-documents",
      message: "No Markdown source documents were discovered",
    });
  }

  // Duplicate IDs across major collections
  const idSets: Array<{ label: string; ids: string[] }> = [
    { label: "document", ids: manifest.documents.map((d) => d.id) },
    { label: "book", ids: manifest.books.map((b) => b.id) },
    { label: "chapter", ids: manifest.chapters.map((c) => c.id) },
    { label: "section", ids: manifest.sections.map((s) => s.id) },
    { label: "heading", ids: manifest.headings.map((h) => h.id) },
    { label: "block", ids: manifest.blocks.map((b) => b.id) },
  ];

  for (const set of idSets) {
    const seen = new Map<string, number>();
    for (const id of set.ids) {
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const [id, count] of seen) {
      if (count > 1) {
        pushError({
          code: "duplicate-id",
          message: `Duplicate ${set.label} id "${id}" (${count} times)`,
        });
      }
    }
  }

  // Empty chapter titles
  for (const chapter of manifest.chapters) {
    if (!chapter.title.trim()) {
      pushError({
        code: "empty-chapter-title",
        message: `Chapter ${chapter.id} has an empty title`,
        sourceDocumentId: chapter.sourceDocumentId,
      });
    }
  }

  // Invalid evidence labels in badges
  for (const badge of manifest.evidenceBadges) {
    if (!EvidenceLabelSchema.safeParse(badge.label).success) {
      pushError({
        code: "invalid-evidence-label",
        message: `Invalid evidence label "${badge.label}" on badge ${badge.id}`,
      });
    }
  }

  // Malformed callouts
  for (const block of manifest.blocks) {
    if (block.type === "callout" && block.malformed) {
      pushError({
        code: "malformed-callout",
        message: `Malformed callout [!${block.rawMarker ?? "unknown"}] in block ${block.id}`,
        sourceDocumentId: block.sourceDocumentId,
      });
    }
  }

  // Broken internal concept references
  for (const link of manifest.conceptLinks) {
    if (!link.resolved) {
      pushError({
        code: "broken-concept-reference",
        message: `Broken concept reference "[[${link.label}]]" → ${link.target}`,
      });
    }
  }

  // Heading hierarchy errors (no skipping levels within a document)
  const byDoc = new Map<string, typeof manifest.headings>();
  for (const heading of manifest.headings) {
    const list = byDoc.get(heading.sourceDocumentId) ?? [];
    list.push(heading);
    byDoc.set(heading.sourceDocumentId, list);
  }

  for (const [docId, docHeadings] of byDoc) {
    const ordered = [...docHeadings].sort((a, b) => a.order - b.order);
    let previousDepth = 0;
    for (const heading of ordered) {
      if (previousDepth > 0 && heading.depth > previousDepth + 1) {
        // Detected as a hierarchy issue; warning (not error) so legacy source subtitles like h1→h3 remain valid.
        pushWarning({
          code: "heading-hierarchy-error",
          message: `Heading depth jumps from h${previousDepth} to h${heading.depth} at "${heading.title}"`,
          sourceDocumentId: docId,
        });
      }
      previousDepth = heading.depth;
    }
  }

  // Duplicate generated routes
  const routes = new Map<string, number>();
  for (const chapter of manifest.chapters) {
    routes.set(chapter.route, (routes.get(chapter.route) ?? 0) + 1);
  }
  for (const book of manifest.books) {
    routes.set(book.route, (routes.get(book.route) ?? 0) + 1);
  }
  for (const [route, count] of routes) {
    if (count > 1) {
      pushError({
        code: "duplicate-route",
        message: `Duplicate generated route "${route}" (${count} times)`,
      });
    }
  }

  // Carry non-duplicated parser warnings
  for (const warning of manifest.warnings) {
    if (warning.code === "malformed-callout" || warning.code === "invalid-evidence-label") {
      continue;
    }
    pushWarning({ ...warning });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
