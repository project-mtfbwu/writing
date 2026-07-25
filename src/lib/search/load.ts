import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SearchIndexSchema, type SearchIndex } from "@/types/search";
import { GENERATED_SEARCH_INDEX_RELATIVE, buildSearchIndex } from "@/lib/search";
import { loadContentManifest } from "@/lib/reader/catalog";

export async function loadSearchIndex(): Promise<SearchIndex> {
  const indexPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    GENERATED_SEARCH_INDEX_RELATIVE,
  );
  if (existsSync(indexPath)) {
    return SearchIndexSchema.parse(JSON.parse(readFileSync(indexPath, "utf8")));
  }
  const manifest = await loadContentManifest();
  return buildSearchIndex(manifest);
}
