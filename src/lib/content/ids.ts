import GithubSlugger from "github-slugger";

const slugger = new GithubSlugger();

export function normalizeSlug(input: string): string {
  slugger.reset();
  const slug = slugger.slug(input.trim());
  return slug.length > 0 ? slug : "section";
}

export function normalizeHeadingPath(parts: string[]): string[] {
  return parts.map((part) => normalizeSlug(part)).filter(Boolean);
}

/**
 * Stable content IDs from document id + normalized heading path.
 * Collision handling is deterministic via a shared registry.
 */
export class StableIdRegistry {
  private readonly used = new Map<string, number>();

  allocate(parts: string[]): string {
    const base = parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join("/");
    const normalizedBase = base.length > 0 ? base : "untitled";
    const count = this.used.get(normalizedBase) ?? 0;
    this.used.set(normalizedBase, count + 1);
    if (count === 0) {
      return normalizedBase;
    }
    return `${normalizedBase}--${count + 1}`;
  }

  allocateBlock(documentId: string, kind: string, hint: string): string {
    const slug = normalizeSlug(hint).slice(0, 48) || kind;
    return this.allocate([documentId, "block", kind, slug]);
  }
}

export function documentIdFromFileName(fileName: string, frontmatterId?: string | null): string {
  if (frontmatterId && frontmatterId.trim().length > 0) {
    return normalizeSlug(frontmatterId);
  }
  return normalizeSlug(fileName.replace(/\.md$/i, ""));
}

export function chapterRoute(documentId: string, chapterSlug: string): string {
  return `/read/${documentId}/${chapterSlug}`;
}

export function bookRoute(documentId: string): string {
  return `/read/${documentId}`;
}
