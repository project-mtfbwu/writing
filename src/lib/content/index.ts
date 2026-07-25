export {
  SOURCE_ROOT_RELATIVE,
  GENERATED_MANIFEST_RELATIVE,
  listSourceMarkdownFiles,
  parseSourceDocument,
  buildContentManifest,
  serializeManifest,
  getContinuousBlocks,
  getChapterNavigation,
} from "@/lib/content/parse";

export { validateContentManifest } from "@/lib/content/validate";
export type { ValidationIssue, ValidationResult } from "@/lib/content/validate";

export {
  StableIdRegistry,
  normalizeSlug,
  documentIdFromFileName,
  chapterRoute,
  bookRoute,
} from "@/lib/content/ids";

export {
  extractEvidenceBadges,
  findInvalidEvidenceMarkers,
  isEvidenceLabel,
} from "@/lib/content/evidence";

export {
  normalizeCalloutKind,
  parseCalloutMarkerLine,
  isKnownCalloutKind,
} from "@/lib/content/callouts";

export { markdownToSafeHtml } from "@/lib/content/html";
