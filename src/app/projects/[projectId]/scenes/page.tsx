import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneEditorList } from "@/components/beats/SceneEditorList";
import { loadStructureProjection } from "@/lib/beats/actions";
import { projectStructureOrder } from "@/lib/beats/order";
import { requireWritingAccess } from "@/lib/demo/access";
import { demoGetProject } from "@/lib/demo/repository";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ scene?: string }>;
};

export default async function ScenesPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const access = await requireWritingAccess(`/projects/${projectId}/scenes`);

  const projectTitle =
    access.mode === "demo"
      ? (await demoGetProject(projectId))?.title
      : (
          await access.supabase.from("projects").select("id, title").eq("id", projectId).maybeSingle()
        ).data?.title;
  if (!projectTitle) notFound();

  const { beats, scenes } = await loadStructureProjection(projectId);
  const projection = projectStructureOrder(beats, scenes);

  return (
    <main className="project-page project-page--wide">
      <p className="atlas__kicker">
        <Link href={`/projects/${projectId}`}>{projectTitle}</Link> · Scenes
        {access.mode === "demo" ? " · Test mode" : ""}
      </p>
      <h1>Scenes</h1>
      <nav className="project-nav">
        <Link href={`/projects/${projectId}/structure`}>Structure</Link>
        <Link href={`/projects/${projectId}/beats`}>Beats</Link>
        <Link href={`/projects/${projectId}/scene-lab`}>Scene Lab</Link>
        <Link href={`/projects/${projectId}/screenplay`}>Screenplay</Link>
      </nav>
      <aside className="scene-navigator" aria-label="Scene navigator">
        <h2>Navigator</h2>
        <ol>
          {projection.screenplayScenes.map((scene) => (
            <li key={scene.id}>
              <Link href={`/projects/${projectId}/scenes?scene=${scene.id}`}>
                {scene.heading || "Untitled"}
              </Link>
            </li>
          ))}
        </ol>
      </aside>
      <SceneEditorList
        projectId={projectId}
        initialScenes={projection.screenplayScenes}
        selectedSceneId={query.scene ?? null}
      />
    </main>
  );
}
