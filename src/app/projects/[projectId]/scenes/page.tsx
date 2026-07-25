import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SceneEditorList } from "@/components/beats/SceneEditorList";
import { loadStructureProjection } from "@/lib/beats/actions";
import { projectStructureOrder } from "@/lib/beats/order";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ scene?: string }>;
};

export default async function ScenesPage({ params, searchParams }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${projectId}/scenes`);

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { beats, scenes } = await loadStructureProjection(projectId);
  const projection = projectStructureOrder(beats, scenes);

  return (
    <main className="project-page project-page--wide">
      <p className="atlas__kicker">
        <Link href={`/projects/${projectId}`}>{project.title}</Link> · Scenes
      </p>
      <h1>Scenes</h1>
      <nav className="project-nav">
        <Link href={`/projects/${projectId}/structure`}>Structure</Link>
        <Link href={`/projects/${projectId}/beats`}>Beats</Link>
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
