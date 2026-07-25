import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildContentManifest,
  GENERATED_MANIFEST_RELATIVE,
  serializeManifest,
} from "../src/lib/content/parse";
import { validateContentManifest } from "../src/lib/content/validate";
import { ContentManifestSchema } from "../src/types/content";

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

  if (result.errors.length > 0) {
    console.error(`content:check failed with ${result.errors.length} error(s)`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `content:check passed (${manifest.stats.documentCount} documents, ${manifest.stats.chapterCount} chapters, ${manifest.stats.headingCount} headings)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
