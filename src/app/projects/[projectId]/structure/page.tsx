import Link from "next/link";
import { notFound } from "next/navigation";
import { BeatBoard } from "@/components/beats/BeatBoard";
import { loadStructureProjection } from "@/lib/beats/actions";
import { requireWritingAccess } from "@/lib/demo/access";
import { demoGetProject } from "@/lib/demo/repository";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StructurePage({ params }: PageProps) {
  const { projectId } = await params;
  const access = await requireWritingAccess(`/projects/${projectId}/structure`);

  const projectTitle =
    access.mode === "demo"
      ? (await demoGetProject(projectId))?.title
      : (
          await access.supabase.from("projects").select("id, title").eq("id", projectId).maybeSingle()
        ).data?.title;

  if (!projectTitle) notFound();

  let beats = [] as Awaited<ReturnType<typeof loadStructureProjection>>["beats"];
  let scenes = [] as Awaited<ReturnType<typeof loadStructureProjection>>["scenes"];
  try {
    const loaded = await loadStructureProjection(projectId);
    beats = loaded.beats;
    scenes = loaded.scenes;
  } catch (error) {
    return (
      <main className="project-page">
        <p className="auth-error">
          {error instanceof Error ? error.message : "Could not load structure."}
        </p>
      </main>
    );
  }

  return (
    <main className="project-page project-page--wide">
      <p className="atlas__kicker">
        <Link href={`/projects/${projectId}`}>{projectTitle}</Link> · Structure
        {access.mode === "demo" ? " · Test mode" : ""}
      </p>
      <h1>Structure</h1>
      <nav className="project-nav">
        <Link href={`/projects/${projectId}/beats`}>Beats</Link>
        <Link href={`/projects/${projectId}/scenes`}>Scenes</Link>
        <Link href={`/projects/${projectId}/scene-lab`}>Scene Lab</Link>
        <Link href={`/projects/${projectId}/screenplay`}>Screenplay</Link>
      </nav>
      <BeatBoard projectId={projectId} initialBeats={beats} initialScenes={scenes} />
    </main>
  );
}
