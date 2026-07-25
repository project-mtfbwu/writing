import { exportFountain } from "@/lib/screenplay/export";
import type { ScreenplayElement } from "@/lib/screenplay/model";
import type { Scene } from "@/lib/beats/order";
import type { Beat } from "@/lib/beats/order";

export type ProjectExportBundle = {
  project: Record<string, unknown>;
  beats: Beat[];
  scenes: Scene[];
  elements: ScreenplayElement[];
  findings: Array<Record<string, unknown>>;
  exerciseAttempts: Array<Record<string, unknown>>;
  notesMarkdown: string;
  exportedAt: string;
};

export function projectToMarkdownSummary(bundle: ProjectExportBundle): string {
  const title = String(bundle.project.title ?? "Untitled");
  const lines = [
    `# ${title}`,
    "",
    `Exported: ${bundle.exportedAt}`,
    "",
    "## Beats",
    ...bundle.beats.map((beat) => `- ${beat.sortOrder + 1}. ${beat.name}`),
    "",
    "## Scenes",
    ...bundle.scenes.map(
      (scene) =>
        `- ${scene.heading || "Untitled"} (${scene.chargeIn || "?"} → ${scene.chargeOut || "?"})`,
    ),
    "",
    "## Review findings",
    ...(bundle.findings.length === 0
      ? ["- None exported"]
      : bundle.findings.map(
          (finding) =>
            `- ${finding.rule_id ?? finding.ruleId}: ${finding.explanation ?? finding.message ?? ""} [${finding.status}]`,
        )),
    "",
  ];
  return lines.join("\n");
}

export function findingsToMarkdown(
  findings: Array<{
    rule_id?: string;
    ruleId?: string;
    explanation?: string;
    message?: string;
    status?: string;
    evidence_location?: string;
    evidenceLocation?: string;
  }>,
): string {
  const lines = ["# Review findings", ""];
  if (findings.length === 0) {
    lines.push("No findings.");
    return `${lines.join("\n")}\n`;
  }
  for (const finding of findings) {
    lines.push(`## ${finding.rule_id ?? finding.ruleId ?? "rule"}`);
    lines.push("");
    lines.push(String(finding.explanation ?? finding.message ?? ""));
    lines.push("");
    lines.push(`- Status: ${finding.status ?? "unknown"}`);
    lines.push(
      `- Evidence: ${finding.evidence_location ?? finding.evidenceLocation ?? "n/a"}`,
    );
    lines.push("");
  }
  return lines.join("\n");
}

export function buildFountainFromElements(
  elements: ScreenplayElement[],
  title: string,
): string {
  return exportFountain(elements, title);
}
