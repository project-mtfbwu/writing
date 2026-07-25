import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { toString } from "mdast-util-to-string";
import { parse as parseYaml } from "yaml";
import type {
  Root,
  Content,
  Heading as MdastHeading,
  List,
  Table,
  Code,
  Blockquote,
  Paragraph,
} from "mdast";
import {
  bookRoute,
  chapterRoute,
  documentIdFromFileName,
  normalizeSlug,
  StableIdRegistry,
} from "@/lib/content/ids";
import { extractEvidenceBadges, findInvalidEvidenceMarkers } from "@/lib/content/evidence";
import { parseCalloutMarkerLine } from "@/lib/content/callouts";
import { markdownToSafeHtml } from "@/lib/content/html";
import type {
  Book,
  Chapter,
  ConceptLink,
  ContentBlock,
  ContentManifest,
  EvidenceBadge,
  Heading,
  ParseWarning,
  Section,
  SourceDocument,
} from "@/types/content";

export const SOURCE_ROOT_RELATIVE = "content/source";
export const GENERATED_MANIFEST_RELATIVE = "content/generated/manifest.json";

const CONCEPT_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;
const INTERNAL_HASH_LINK = /\]\(#([^)]+)\)/g;

type Frontmatter = {
  id?: string;
  title?: string;
};

type HeadingIndex = {
  node: MdastHeading;
  index: number;
  title: string;
  depth: number;
  heading: Heading;
};

type ParsedDocument = {
  source: SourceDocument;
  book: Book;
  chapters: Chapter[];
  sections: Section[];
  headings: Heading[];
  blocks: ContentBlock[];
  evidenceBadges: EvidenceBadge[];
  conceptLinks: ConceptLink[];
  warnings: ParseWarning[];
};

function checksum(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function extractFrontmatter(tree: Root): { data: Frontmatter; bodyStartIndex: number } {
  const first = tree.children[0];
  if (first && first.type === "yaml") {
    const data = (parseYaml(first.value) ?? {}) as Frontmatter;
    return { data, bodyStartIndex: 1 };
  }
  return { data: {}, bodyStartIndex: 0 };
}

function getBlockquoteLines(node: Blockquote): string[] {
  return node.children.map((child) => toString(child));
}

function tableCells(node: Table): { headers: string[]; rows: string[][] } {
  const rows = node.children.map((row) => row.children.map((cell) => toString(cell).trim()));
  return { headers: rows[0] ?? [], rows: rows.slice(1) };
}

function listItems(node: List): string[] {
  return node.children.map((item) => toString(item).trim());
}

function collectConceptLinks(
  text: string,
  registry: StableIdRegistry,
  documentId: string,
  blockId: string,
  headingSlugs: Set<string>,
): ConceptLink[] {
  const links: ConceptLink[] = [];

  for (const match of text.matchAll(CONCEPT_LINK_PATTERN)) {
    const target = (match[1] ?? "").trim();
    if (!target) continue;
    const slug = normalizeSlug(target);
    links.push({
      id: registry.allocate([documentId, "concept", slug, blockId]),
      target: slug,
      label: target,
      resolved: headingSlugs.has(slug),
      sourceBlockId: blockId,
    });
  }

  for (const match of text.matchAll(INTERNAL_HASH_LINK)) {
    const target = (match[1] ?? "").trim();
    if (!target) continue;
    links.push({
      id: registry.allocate([documentId, "concept-hash", target, blockId]),
      target,
      label: target,
      resolved: headingSlugs.has(target),
      sourceBlockId: blockId,
    });
  }

  return links;
}

async function convertNodesToBlocks(
  nodes: Content[],
  ctx: {
    documentId: string;
    registry: StableIdRegistry;
    warnings: ParseWarning[];
    headingSlugs: Set<string>;
    chapterId: string;
    sectionId?: string;
    orderStart: number;
  },
): Promise<{
  blocks: ContentBlock[];
  evidence: EvidenceBadge[];
  concepts: ConceptLink[];
  nextOrder: number;
}> {
  const blocks: ContentBlock[] = [];
  const evidence: EvidenceBadge[] = [];
  const concepts: ConceptLink[] = [];
  let order = ctx.orderStart;

  const finalize = <T extends ContentBlock>(block: T, textForMeta: string): T => {
    const badges = extractEvidenceBadges(textForMeta, ctx.registry, ctx.documentId, block.id);
    evidence.push(...badges);
    concepts.push(
      ...collectConceptLinks(textForMeta, ctx.registry, ctx.documentId, block.id, ctx.headingSlugs),
    );
    for (const invalid of findInvalidEvidenceMarkers(textForMeta)) {
      ctx.warnings.push({
        code: "invalid-evidence-label",
        message: `Invalid evidence marker ${invalid}`,
        sourceDocumentId: ctx.documentId,
      });
    }
    return { ...block, evidenceBadges: badges };
  };

  for (const node of nodes) {
    if (node.type === "heading") {
      continue;
    }

    if (node.type === "thematicBreak") {
      blocks.push({
        id: ctx.registry.allocateBlock(ctx.documentId, "hr", `hr-${order}`),
        type: "thematic-break",
        order: order++,
        sourceDocumentId: ctx.documentId,
        chapterId: ctx.chapterId,
        sectionId: ctx.sectionId,
        evidenceBadges: [],
      });
      continue;
    }

    if (node.type === "code") {
      const code = node as Code;
      const value = code.value;
      const html = await markdownToSafeHtml(`\`\`\`${code.lang ?? ""}\n${value}\n\`\`\``);
      const treatAsFormula = !code.lang || code.lang.toLowerCase() === "formula";
      if (treatAsFormula) {
        blocks.push(
          finalize(
            {
              id: ctx.registry.allocateBlock(ctx.documentId, "formula", value.slice(0, 32)),
              type: "formula",
              order: order++,
              sourceDocumentId: ctx.documentId,
              chapterId: ctx.chapterId,
              sectionId: ctx.sectionId,
              text: value,
              html,
              source: "code",
              evidenceBadges: [],
            },
            value,
          ),
        );
      } else {
        blocks.push(
          finalize(
            {
              id: ctx.registry.allocateBlock(ctx.documentId, "code", value.slice(0, 32)),
              type: "code",
              order: order++,
              sourceDocumentId: ctx.documentId,
              chapterId: ctx.chapterId,
              sectionId: ctx.sectionId,
              lang: code.lang ?? null,
              value,
              html,
              evidenceBadges: [],
            },
            value,
          ),
        );
      }
      continue;
    }

    if (node.type === "table") {
      const table = node as Table;
      const { headers, rows } = tableCells(table);
      const md = [
        `| ${headers.join(" | ")} |`,
        `| ${headers.map(() => "---").join(" | ")} |`,
        ...rows.map((row) => `| ${row.join(" | ")} |`),
      ].join("\n");
      const html = await markdownToSafeHtml(md);
      const text = [headers.join(" | "), ...rows.map((row) => row.join(" | "))].join("\n");
      blocks.push(
        finalize(
          {
            id: ctx.registry.allocateBlock(ctx.documentId, "table", headers[0] ?? `table-${order}`),
            type: "table",
            order: order++,
            sourceDocumentId: ctx.documentId,
            chapterId: ctx.chapterId,
            sectionId: ctx.sectionId,
            headers,
            rows,
            html,
            evidenceBadges: [],
          },
          text,
        ),
      );
      continue;
    }

    if (node.type === "list") {
      const list = node as List;
      const items = listItems(list);
      const md = items
        .map((item, index) => (list.ordered ? `${index + 1}. ${item}` : `- ${item}`))
        .join("\n");
      const html = await markdownToSafeHtml(md);
      blocks.push(
        finalize(
          {
            id: ctx.registry.allocateBlock(ctx.documentId, "list", items[0] ?? `list-${order}`),
            type: "list",
            order: order++,
            sourceDocumentId: ctx.documentId,
            chapterId: ctx.chapterId,
            sectionId: ctx.sectionId,
            ordered: Boolean(list.ordered),
            items,
            html,
            evidenceBadges: [],
          },
          items.join("\n"),
        ),
      );
      continue;
    }

    if (node.type === "blockquote") {
      const quote = node as Blockquote;
      const lines = getBlockquoteLines(quote);
      const marker = parseCalloutMarkerLine(lines[0] ?? "");

      if (marker) {
        const text = lines.slice(1).join("\n").trim();
        const html = await markdownToSafeHtml(text || (lines[0] ?? ""));

        if (marker.malformed || !marker.kind) {
          ctx.warnings.push({
            code: "malformed-callout",
            message: `Malformed or unknown callout marker [!${marker.rawKind}]`,
            sourceDocumentId: ctx.documentId,
          });
          blocks.push(
            finalize(
              {
                id: ctx.registry.allocateBlock(ctx.documentId, "callout", marker.rawKind || "unknown"),
                type: "callout",
                order: order++,
                sourceDocumentId: ctx.documentId,
                chapterId: ctx.chapterId,
                sectionId: ctx.sectionId,
                kind: "definition",
                title: marker.title,
                text: text || (lines[0] ?? ""),
                html,
                malformed: true,
                rawMarker: marker.rawKind,
                evidenceBadges: [],
              },
              text || (lines[0] ?? ""),
            ),
          );
          continue;
        }

        if (marker.kind === "formula") {
          blocks.push(
            finalize(
              {
                id: ctx.registry.allocateBlock(ctx.documentId, "formula", text.slice(0, 32)),
                type: "formula",
                order: order++,
                sourceDocumentId: ctx.documentId,
                chapterId: ctx.chapterId,
                sectionId: ctx.sectionId,
                text,
                html,
                source: "callout",
                evidenceBadges: [],
              },
              text,
            ),
          );
          continue;
        }

        if (marker.kind === "try-it") {
          blocks.push(
            finalize(
              {
                id: ctx.registry.allocateBlock(ctx.documentId, "exercise", text.slice(0, 32)),
                type: "exercise",
                order: order++,
                sourceDocumentId: ctx.documentId,
                chapterId: ctx.chapterId,
                sectionId: ctx.sectionId,
                text,
                html,
                prompt: text,
                evidenceBadges: [],
              },
              text,
            ),
          );
          continue;
        }

        blocks.push(
          finalize(
            {
              id: ctx.registry.allocateBlock(ctx.documentId, "callout", marker.kind),
              type: "callout",
              order: order++,
              sourceDocumentId: ctx.documentId,
              chapterId: ctx.chapterId,
              sectionId: ctx.sectionId,
              kind: marker.kind,
              title: marker.title,
              text,
              html,
              malformed: false,
              rawMarker: marker.rawKind,
              evidenceBadges: [],
            },
            text,
          ),
        );
        continue;
      }

      const text = lines.join("\n").trim();
      const html = await markdownToSafeHtml(lines.map((line) => `> ${line}`).join("\n"));
      blocks.push(
        finalize(
          {
            id: ctx.registry.allocateBlock(ctx.documentId, "quote", text.slice(0, 32)),
            type: "quote",
            order: order++,
            sourceDocumentId: ctx.documentId,
            chapterId: ctx.chapterId,
            sectionId: ctx.sectionId,
            text,
            html,
            evidenceBadges: [],
          },
          text,
        ),
      );
      continue;
    }

    if (node.type === "paragraph") {
      const paragraph = node as Paragraph;
      const text = toString(paragraph);
      const html = await markdownToSafeHtml(text);
      blocks.push(
        finalize(
          {
            id: ctx.registry.allocateBlock(ctx.documentId, "paragraph", text.slice(0, 32)),
            type: "paragraph",
            order: order++,
            sourceDocumentId: ctx.documentId,
            chapterId: ctx.chapterId,
            sectionId: ctx.sectionId,
            text,
            html,
            evidenceBadges: [],
          },
          text,
        ),
      );
      continue;
    }

    const text = toString(node);
    if (!text.trim()) {
      continue;
    }
    const html = await markdownToSafeHtml(text);
    blocks.push(
      finalize(
        {
          id: ctx.registry.allocateBlock(ctx.documentId, "paragraph", text.slice(0, 32)),
          type: "paragraph",
          order: order++,
          sourceDocumentId: ctx.documentId,
          chapterId: ctx.chapterId,
          sectionId: ctx.sectionId,
          text,
          html,
          evidenceBadges: [],
        },
        text,
      ),
    );
  }

  return { blocks, evidence, concepts, nextOrder: order };
}

function parseMarkdownTree(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter).parse(markdown) as Root;
}

export async function parseSourceDocument(
  absolutePath: string,
  repoRoot: string,
): Promise<ParsedDocument> {
  const relativePath = path.relative(repoRoot, absolutePath).split(path.sep).join("/");
  const fileName = path.basename(absolutePath);
  const markdown = readFileSync(absolutePath, "utf8");
  const tree = parseMarkdownTree(markdown);
  const { data: frontmatter, bodyStartIndex } = extractFrontmatter(tree);
  const registry = new StableIdRegistry();
  const warnings: ParseWarning[] = [];
  const documentId = documentIdFromFileName(fileName, frontmatter.id ?? null);
  const bodyChildren = tree.children.slice(bodyStartIndex) as Content[];

  const rawHeadings: Omit<HeadingIndex, "heading">[] = [];
  bodyChildren.forEach((node, index) => {
    if (node.type === "heading") {
      rawHeadings.push({
        node: node as MdastHeading,
        index,
        title: toString(node).trim(),
        depth: node.depth,
      });
    }
  });

  const titleFromFirstH1 = rawHeadings.find((heading) => heading.depth === 1)?.title;
  const title = frontmatter.title?.trim() || titleFromFirstH1 || fileName.replace(/\.md$/i, "");

  const stack: { depth: number; slug: string }[] = [];
  const headings: Heading[] = [];
  const headingSlugs = new Set<string>();
  const indexedHeadings: HeadingIndex[] = [];

  rawHeadings.forEach((item, order) => {
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= item.depth) {
      stack.pop();
    }
    const slug = normalizeSlug(item.title);
    stack.push({ depth: item.depth, slug });
    const pathSlugs = stack.map((entry) => entry.slug);
    const id = registry.allocate([documentId, ...pathSlugs]);
    headingSlugs.add(slug);
    const heading: Heading = {
      id,
      depth: item.depth,
      title: item.title,
      slug,
      path: pathSlugs,
      sourceDocumentId: documentId,
      sourceHeading: item.title,
      order,
    };
    headings.push(heading);
    indexedHeadings.push({ ...item, heading });
  });

  type ChapterRange = {
    chapterHeading: HeadingIndex | null;
    partTitle: string | null;
    startIndex: number;
    endIndex: number;
  };

  const levelTwo = indexedHeadings.filter((heading) => heading.depth === 2);
  const ranges: ChapterRange[] = [];

  if (levelTwo.length === 0) {
    ranges.push({
      chapterHeading: null,
      partTitle: titleFromFirstH1 ?? null,
      startIndex: 0,
      endIndex: bodyChildren.length,
    });
  } else {
    const firstH2 = levelTwo[0]!;
    if (firstH2.index > 0) {
      const preface = bodyChildren.slice(0, firstH2.index);
      const hasContent = preface.some((node) => node.type !== "heading");
      if (hasContent) {
        ranges.push({
          chapterHeading: null,
          partTitle: titleFromFirstH1 ?? null,
          startIndex: 0,
          endIndex: firstH2.index,
        });
      }
    }

    for (let i = 0; i < levelTwo.length; i++) {
      const current = levelTwo[i]!;
      const next = levelTwo[i + 1];
      const precedingH1 = [...indexedHeadings]
        .reverse()
        .find((heading) => heading.depth === 1 && heading.index < current.index);
      ranges.push({
        chapterHeading: current,
        partTitle: precedingH1?.title ?? titleFromFirstH1 ?? null,
        startIndex: current.index,
        endIndex: next ? next.index : bodyChildren.length,
      });
    }
  }

  const chapters: Chapter[] = [];
  const sections: Section[] = [];
  const blocks: ContentBlock[] = [];
  const evidenceBadges: EvidenceBadge[] = [];
  const conceptLinks: ConceptLink[] = [];
  const usedChapterSlugs = new Map<string, number>();
  let blockOrder = 0;

  const uniqueChapterSlug = (title: string): string => {
    const base = normalizeSlug(title);
    const count = usedChapterSlugs.get(base) ?? 0;
    usedChapterSlugs.set(base, count + 1);
    return count === 0 ? base : `${base}--${count + 1}`;
  };

  for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
    const range = ranges[rangeIndex]!;
    const chapterTitle = range.chapterHeading?.title ?? "Introduction";
    const chapterSlug = uniqueChapterSlug(chapterTitle);
    const chapterId =
      range.chapterHeading?.heading.id ?? registry.allocate([documentId, "chapter", "introduction"]);
    const headingId = range.chapterHeading?.heading.id ?? chapterId;
    const slice = bodyChildren.slice(range.startIndex, range.endIndex);
    const chapterBlockIds: string[] = [];
    const sectionIds: string[] = [];

    if (range.chapterHeading) {
      const headingBlock: ContentBlock = {
        id: registry.allocateBlock(documentId, "heading", chapterTitle),
        type: "heading",
        order: blockOrder++,
        sourceDocumentId: documentId,
        chapterId,
        depth: 2,
        title: chapterTitle,
        headingId,
        evidenceBadges: [],
      };
      blocks.push(headingBlock);
      chapterBlockIds.push(headingBlock.id);
    }

    const localHeadings = indexedHeadings.filter(
      (heading) =>
        heading.depth >= 3 && heading.index >= range.startIndex && heading.index < range.endIndex,
    );

    type SectionRange = {
      heading: HeadingIndex | null;
      start: number;
      end: number;
    };
    const sectionRanges: SectionRange[] = [];
    const contentOffset = range.chapterHeading ? 1 : 0;

    if (localHeadings.length === 0) {
      sectionRanges.push({ heading: null, start: contentOffset, end: slice.length });
    } else {
      const firstLocalAbsolute = localHeadings[0]!.index;
      const firstLocalRelative = firstLocalAbsolute - range.startIndex;
      if (firstLocalRelative > contentOffset) {
        sectionRanges.push({ heading: null, start: contentOffset, end: firstLocalRelative });
      }
      for (let i = 0; i < localHeadings.length; i++) {
        const current = localHeadings[i]!;
        const next = localHeadings[i + 1];
        sectionRanges.push({
          heading: current,
          start: current.index - range.startIndex,
          end: next ? next.index - range.startIndex : slice.length,
        });
      }
    }

    for (const sectionRange of sectionRanges) {
      const sectionTitle = sectionRange.heading?.title ?? chapterTitle;
      const sectionId =
        sectionRange.heading?.heading.id ??
        registry.allocate([documentId, "section", chapterSlug, "body"]);
      const sectionDepth = sectionRange.heading?.depth ?? 2;

      if (sectionRange.heading) {
        const headingBlock: ContentBlock = {
          id: registry.allocateBlock(documentId, "heading", sectionTitle),
          type: "heading",
          order: blockOrder++,
          sourceDocumentId: documentId,
          chapterId,
          sectionId,
          depth: sectionDepth,
          title: sectionTitle,
          headingId: sectionRange.heading.heading.id,
          evidenceBadges: [],
        };
        blocks.push(headingBlock);
        chapterBlockIds.push(headingBlock.id);
      }

      const nodesStart = sectionRange.heading ? sectionRange.start + 1 : sectionRange.start;
      const contentNodes = slice.slice(nodesStart, sectionRange.end);
      const built = await convertNodesToBlocks(contentNodes, {
        documentId,
        registry,
        warnings,
        headingSlugs,
        chapterId,
        sectionId: sectionRange.heading ? sectionId : undefined,
        orderStart: blockOrder,
      });
      blockOrder = built.nextOrder;
      blocks.push(...built.blocks);
      evidenceBadges.push(...built.evidence);
      conceptLinks.push(...built.concepts);
      chapterBlockIds.push(...built.blocks.map((block) => block.id));

      if (sectionRange.heading) {
        sections.push({
          id: sectionId,
          title: sectionTitle,
          headingId: sectionRange.heading.heading.id,
          depth: sectionDepth,
          order: sections.length,
          sourceDocumentId: documentId,
          sourceHeading: sectionTitle,
          blockIds: built.blocks.map((block) => block.id),
        });
        sectionIds.push(sectionId);
      }
    }

    chapters.push({
      id: chapterId,
      title: chapterTitle,
      slug: chapterSlug,
      order: rangeIndex,
      sourceDocumentId: documentId,
      sourceHeading: chapterTitle,
      sourceFile: relativePath,
      partTitle: range.partTitle,
      headingId,
      route: chapterRoute(documentId, chapterSlug),
      previousChapterId: null,
      nextChapterId: null,
      sectionIds,
      blockIds: chapterBlockIds,
    });
  }

  for (let i = 0; i < chapters.length; i++) {
    chapters[i]!.previousChapterId = i > 0 ? chapters[i - 1]!.id : null;
    chapters[i]!.nextChapterId = i < chapters.length - 1 ? chapters[i + 1]!.id : null;
  }

  const book: Book = {
    id: documentId,
    title,
    sourceDocumentIds: [documentId],
    chapterIds: chapters.map((chapter) => chapter.id),
    route: bookRoute(documentId),
  };

  const source: SourceDocument = {
    id: documentId,
    title,
    fileName,
    relativePath,
    frontmatterId: frontmatter.id ?? null,
    checksum: checksum(markdown),
    headingCount: headings.length,
    chapterCount: chapters.length,
    evidenceCount: evidenceBadges.length,
    tableCount: blocks.filter((block) => block.type === "table").length,
    codeBlockCount: blocks.filter((block) => block.type === "code" || block.type === "formula").length,
    calloutCount: blocks.filter((block) => block.type === "callout").length,
    formulaCount: blocks.filter((block) => block.type === "formula").length,
    warningCount: warnings.length,
  };

  return {
    source,
    book,
    chapters,
    sections,
    headings,
    blocks,
    evidenceBadges,
    conceptLinks,
    warnings,
  };
}

export function listSourceMarkdownFiles(repoRoot: string): string[] {
  const dir = path.join(repoRoot, SOURCE_ROOT_RELATIVE);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(dir, name));
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function deterministicIsoDate(checksums: string[]): string {
  const digest = createHash("sha256").update(checksums.join("|"), "utf8").digest("hex");
  const epoch = parseInt(digest.slice(0, 8), 16) % 1_700_000_000;
  return new Date(epoch * 1000).toISOString();
}

export async function buildContentManifest(repoRoot: string): Promise<ContentManifest> {
  const files = listSourceMarkdownFiles(repoRoot);
  const parsed: ParsedDocument[] = [];
  for (const file of files) {
    parsed.push(await parseSourceDocument(file, repoRoot));
  }
  parsed.sort((a, b) => a.source.id.localeCompare(b.source.id));

  const documents = parsed.map((item) => item.source);
  const books = parsed.map((item) => item.book);
  const chapters = parsed.flatMap((item) => item.chapters);
  const sections = parsed.flatMap((item) => item.sections);
  const headings = parsed.flatMap((item) => item.headings);
  const blocks = parsed.flatMap((item) => item.blocks);
  const evidenceBadges = parsed.flatMap((item) => item.evidenceBadges);
  const conceptLinks = parsed.flatMap((item) => item.conceptLinks);
  const warnings = parsed.flatMap((item) => item.warnings);

  const manifest: ContentManifest = {
    version: 1,
    generatedAt: deterministicIsoDate(documents.map((document) => document.checksum)),
    sourceRoot: SOURCE_ROOT_RELATIVE,
    documents: sortById(documents),
    books: sortById(books),
    chapters: [...chapters].sort((a, b) => a.route.localeCompare(b.route)),
    sections: sortById(sections),
    headings: sortById(headings),
    blocks: sortById(blocks),
    evidenceBadges: sortById(evidenceBadges),
    conceptLinks: sortById(conceptLinks),
    warnings: [...warnings].sort((a, b) =>
      `${a.code}:${a.message}:${a.sourceDocumentId ?? ""}`.localeCompare(
        `${b.code}:${b.message}:${b.sourceDocumentId ?? ""}`,
      ),
    ),
    stats: {
      documentCount: documents.length,
      chapterCount: chapters.length,
      headingCount: headings.length,
      evidenceCount: evidenceBadges.length,
      tableCount: blocks.filter((block) => block.type === "table").length,
      codeBlockCount: blocks.filter((block) => block.type === "code").length,
      calloutCount: blocks.filter((block) => block.type === "callout").length,
      formulaCount: blocks.filter((block) => block.type === "formula").length,
      warningCount: warnings.length,
    },
  };

  return manifest;
}

export function serializeManifest(manifest: ContentManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function getContinuousBlocks(manifest: ContentManifest, documentId: string): ContentBlock[] {
  const book = manifest.books.find((item) => item.id === documentId);
  if (!book) return [];

  const orderedChapters = book.chapterIds
    .map((id) => manifest.chapters.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is Chapter => Boolean(chapter))
    .sort((a, b) => a.order - b.order);

  const blocks: ContentBlock[] = [];
  for (const chapter of orderedChapters) {
    for (const blockId of chapter.blockIds) {
      const block = manifest.blocks.find((item) => item.id === blockId);
      if (block) blocks.push(block);
    }
  }
  return blocks;
}

export function getChapterNavigation(manifest: ContentManifest, chapterId: string) {
  const chapter = manifest.chapters.find((item) => item.id === chapterId);
  if (!chapter) return null;
  return {
    chapter,
    previous: chapter.previousChapterId
      ? (manifest.chapters.find((item) => item.id === chapter.previousChapterId) ?? null)
      : null,
    next: chapter.nextChapterId
      ? (manifest.chapters.find((item) => item.id === chapter.nextChapterId) ?? null)
      : null,
  };
}
