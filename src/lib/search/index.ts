import { createHash } from "node:crypto";
import type { ContentBlock, ContentManifest, EvidenceLabel } from "@/types/content";
import type { SearchContentType, SearchDocument, SearchIndex } from "@/types/search";

export const GENERATED_SEARCH_INDEX_RELATIVE = "content/generated/search-index.json";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\[\]\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function snippet(text: string, max = 220): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

function blockText(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
      return block.title;
    case "paragraph":
    case "quote":
    case "callout":
    case "formula":
      return block.text;
    case "exercise":
      return block.prompt || block.text;
    case "list":
      return block.items.join("\n");
    case "table":
      return [block.headers.join(" | "), ...block.rows.map((row) => row.join(" | "))].join("\n");
    case "code":
      return block.value;
    default:
      return "";
  }
}

function contentTypeForBlock(block: ContentBlock): SearchContentType {
  if (block.type === "heading") return "heading";
  if (block.type === "paragraph") return "paragraph";
  if (block.type === "formula") return "formula";
  if (block.type === "exercise") return "exercise";
  if (block.type === "table") return "table";
  if (block.type === "quote") return "quote";
  if (block.type === "callout") {
    switch (block.kind) {
      case "secret-sauce":
        return "secret-sauce";
      case "eli5":
        return "eli5";
      case "real-world":
        return "real-world";
      case "evidence":
        return "evidence";
      case "definition":
        return "definition";
      case "formula":
        return "formula";
      case "try-it":
        return "exercise";
      case "source":
        return "reference";
      default:
        return "other";
    }
  }
  if (block.type === "code") return "other";
  return "other";
}

function deepLink(opts: {
  bookId: string;
  chapterSlug: string;
  sectionId?: string | null;
  headingId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.sectionId) params.set("section", opts.sectionId);
  const query = params.toString();
  const hash = opts.headingId ? `#${encodeURIComponent(opts.headingId)}` : "";
  return `/read/${opts.bookId}/${opts.chapterSlug}${query ? `?${query}` : ""}${hash}`;
}

function deterministicGeneratedAt(checksumSeed: string): string {
  const digest = createHash("sha256").update(checksumSeed, "utf8").digest("hex");
  const epoch = parseInt(digest.slice(0, 8), 16) % 1_700_000_000;
  return new Date(epoch * 1000).toISOString();
}

export function buildSearchIndex(manifest: ContentManifest): SearchIndex {
  const documents: SearchDocument[] = [];
  const books = [...manifest.books].sort((a, b) => a.id.localeCompare(b.id));

  for (const book of books) {
    documents.push({
      id: `title:${book.id}`,
      bookId: book.id,
      bookTitle: book.title,
      chapterId: book.chapterIds[0] ?? book.id,
      chapterSlug: "introduction",
      chapterTitle: book.title,
      sectionId: null,
      sectionTitle: null,
      headingId: null,
      blockId: null,
      contentType: "title",
      title: book.title,
      text: book.title,
      normalizedText: normalizeText(book.title),
      evidenceLabels: [],
      href: book.route,
    });

    const chapters = book.chapterIds
      .map((id) => manifest.chapters.find((chapter) => chapter.id === id))
      .filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter))
      .sort((a, b) => a.order - b.order);

    for (const chapter of chapters) {
      const sections = chapter.sectionIds
        .map((id) => manifest.sections.find((section) => section.id === id))
        .filter((section): section is NonNullable<typeof section> => Boolean(section));

      documents.push({
        id: `heading:${chapter.headingId}`,
        bookId: book.id,
        bookTitle: book.title,
        chapterId: chapter.id,
        chapterSlug: chapter.slug,
        chapterTitle: chapter.title,
        sectionId: null,
        sectionTitle: null,
        headingId: chapter.headingId,
        blockId: null,
        contentType: "heading",
        title: chapter.title,
        text: [chapter.partTitle, chapter.title].filter(Boolean).join(" — "),
        normalizedText: normalizeText([chapter.partTitle, chapter.title].filter(Boolean).join(" ")),
        evidenceLabels: [],
        href: deepLink({
          bookId: book.id,
          chapterSlug: chapter.slug,
          headingId: chapter.headingId,
        }),
      });

      for (const section of sections) {
        documents.push({
          id: `heading:${section.headingId}`,
          bookId: book.id,
          bookTitle: book.title,
          chapterId: chapter.id,
          chapterSlug: chapter.slug,
          chapterTitle: chapter.title,
          sectionId: section.id,
          sectionTitle: section.title,
          headingId: section.headingId,
          blockId: null,
          contentType: "heading",
          title: section.title,
          text: section.title,
          normalizedText: normalizeText(section.title),
          evidenceLabels: [],
          href: deepLink({
            bookId: book.id,
            chapterSlug: chapter.slug,
            sectionId: section.id,
            headingId: section.headingId,
          }),
        });
      }

      for (const blockId of chapter.blockIds) {
        const block = manifest.blocks.find((item) => item.id === blockId);
        if (!block) continue;
        if (block.type === "heading" || block.type === "thematic-break") continue;

        const text = blockText(block).trim();
        if (!text) continue;

        const section = block.sectionId
          ? sections.find((item) => item.id === block.sectionId) ?? null
          : null;
        const contentType = contentTypeForBlock(block);
        const evidenceLabels = block.evidenceBadges.map((badge) => badge.label);

        // Evidence-bearing prose also indexed under evidence when labels present
        const types: SearchContentType[] =
          evidenceLabels.length > 0 && contentType === "paragraph"
            ? ["paragraph", "evidence"]
            : [contentType];

        for (const type of types) {
          documents.push({
            id: `${type}:${block.id}`,
            bookId: book.id,
            bookTitle: book.title,
            chapterId: chapter.id,
            chapterSlug: chapter.slug,
            chapterTitle: chapter.title,
            sectionId: section?.id ?? block.sectionId ?? null,
            sectionTitle: section?.title ?? null,
            headingId: section?.headingId ?? chapter.headingId,
            blockId: block.id,
            contentType: type,
            title: section?.title ?? chapter.title,
            text: snippet(text, 400),
            normalizedText: normalizeText(text),
            evidenceLabels,
            href: deepLink({
              bookId: book.id,
              chapterSlug: chapter.slug,
              sectionId: section?.id ?? block.sectionId,
              headingId: section?.headingId ?? chapter.headingId,
            }),
          });
        }
      }
    }
  }

  documents.sort((a, b) => a.id.localeCompare(b.id));

  const checksumSeed = manifest.documents.map((doc) => doc.checksum).join("|");

  return {
    version: 1,
    generatedAt: deterministicGeneratedAt(checksumSeed),
    documentCount: documents.length,
    documents,
  };
}

export function serializeSearchIndex(index: SearchIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}

export function tokenizeQuery(query: string): string[] {
  return normalizeText(query)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractMatchedText(text: string, tokens: string[]): string {
  const lower = text.toLowerCase();
  let bestIndex = -1;
  for (const token of tokens) {
    const index = lower.indexOf(token.toLowerCase());
    if (index >= 0 && (bestIndex < 0 || index < bestIndex)) {
      bestIndex = index;
    }
  }
  if (bestIndex < 0) return snippet(text);
  const start = Math.max(0, bestIndex - 40);
  const end = Math.min(text.length, bestIndex + 140);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

export function searchIndex(
  index: SearchIndex,
  query: string,
): import("@/types/search").GroupedSearchResults {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return {};

  const evidenceToken = tokens.find((token) => /^e[1-5]$/i.test(token) || /^\[e[1-5]\]$/i.test(token));
  const evidenceLabel = evidenceToken
    ? (evidenceToken.replace(/[\[\]]/g, "").toUpperCase() as EvidenceLabel)
    : null;

  const scored: import("@/types/search").SearchResult[] = [];

  for (const doc of index.documents) {
    let score = 0;
    for (const token of tokens) {
      if (doc.normalizedText.includes(token)) score += 3;
      if (normalizeText(doc.title).includes(token)) score += 5;
      if (normalizeText(doc.chapterTitle).includes(token)) score += 2;
      if (doc.evidenceLabels.some((label) => label.toLowerCase() === token.replace(/[\[\]]/g, ""))) {
        score += 6;
      }
    }

    if (evidenceLabel && doc.evidenceLabels.includes(evidenceLabel)) {
      score += 8;
    }

    if (score <= 0) continue;

    scored.push({
      ...doc,
      score,
      matchedText: extractMatchedText(doc.text, tokens),
      evidenceLabel:
        evidenceLabel && doc.evidenceLabels.includes(evidenceLabel)
          ? evidenceLabel
          : (doc.evidenceLabels[0] ?? null),
    });
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const grouped: import("@/types/search").GroupedSearchResults = {};
  for (const result of scored) {
    const list = grouped[result.contentType] ?? [];
    list.push(result);
    grouped[result.contentType] = list;
  }
  return grouped;
}
