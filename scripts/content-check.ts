import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildContentManifest,
  GENERATED_MANIFEST_RELATIVE,
  serializeManifest,
} from "../src/lib/content/parse";
import { validateContentManifest } from "../src/lib/content/validate";
import { ContentManifestSchema } from "../src/types/content";
import {
  buildSearchIndex,
  GENERATED_SEARCH_INDEX_RELATIVE,
  serializeSearchIndex,
} from "../src/lib/search";
import { SearchIndexSchema } from "../src/types/search";

async function main() {
  const repoRoot = process.cwd();
  const manifest = await buildContentManifest(repoRoot);
  const parsed = ContentManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    console.error("Manifest failed schema validation:");
    console.error(parsed.error.message);
    process.exitCode = 1;
    return;
  }

  const result = validateContentManifest(manifest, repoRoot);
  const searchIndex = buildSearchIndex(manifest);
  const searchParsed = SearchIndexSchema.safeParse(searchIndex);
  if (!searchParsed.success) {
    console.error("Search index failed schema validation:");
    console.error(searchParsed.error.message);
    process.exitCode = 1;
    return;
  }

  for (const warning of result.warnings) {
    console.warn(`[warn] ${warning.code}: ${warning.message}`);
  }
  for (const error of result.errors) {
    console.error(`[error] ${error.code}: ${error.message}`);
  }

  const manifestPath = path.join(repoRoot, GENERATED_MANIFEST_RELATIVE);
  if (existsSync(manifestPath)) {
    const onDisk = readFileSync(manifestPath, "utf8");
    const expected = serializeManifest(manifest);
    if (onDisk !== expected) {
      console.error(
        `[error] stale-manifest: ${GENERATED_MANIFEST_RELATIVE} is out of date. Run pnpm content:index.`,
      );
      result.errors.push({
        code: "stale-manifest",
        message: "Generated manifest does not match current sources",
        severity: "error",
      });
    }
  } else {
    console.warn(`[warn] missing-manifest: ${GENERATED_MANIFEST_RELATIVE} not found (run content:index)`);
  }

  const searchPath = path.join(repoRoot, GENERATED_SEARCH_INDEX_RELATIVE);
  if (existsSync(searchPath)) {
    const onDisk = readFileSync(searchPath, "utf8");
    const expected = serializeSearchIndex(searchIndex);
    if (onDisk !== expected) {
      console.error(
        `[error] stale-search-index: ${GENERATED_SEARCH_INDEX_RELATIVE} is out of date. Run pnpm content:index.`,
      );
      result.errors.push({
        code: "stale-search-index",
        message: "Generated search index does not match current sources",
        severity: "error",
      });
    }
  } else {
    console.warn(
      `[warn] missing-search-index: ${GENERATED_SEARCH_INDEX_RELATIVE} not found (run content:index)`,
    );
  }

  if (result.errors.length > 0) {
    console.error(`content:check failed with ${result.errors.length} error(s)`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `content:check passed (${manifest.stats.documentCount} documents, ${manifest.stats.chapterCount} chapters, ${searchIndex.documentCount} search docs)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
