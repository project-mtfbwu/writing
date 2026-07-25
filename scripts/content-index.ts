import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildContentManifest,
  GENERATED_MANIFEST_RELATIVE,
  serializeManifest,
} from "../src/lib/content/parse";

async function main() {
  const repoRoot = process.cwd();
  const manifest = await buildContentManifest(repoRoot);
  const outPath = path.join(repoRoot, GENERATED_MANIFEST_RELATIVE);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeManifest(manifest), "utf8");

  console.log(`Wrote ${GENERATED_MANIFEST_RELATIVE}`);
  console.log(
    JSON.stringify(
      {
        documents: manifest.stats.documentCount,
        chapters: manifest.stats.chapterCount,
        headings: manifest.stats.headingCount,
        evidence: manifest.stats.evidenceCount,
        tables: manifest.stats.tableCount,
        formulas: manifest.stats.formulaCount,
        warnings: manifest.stats.warningCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
