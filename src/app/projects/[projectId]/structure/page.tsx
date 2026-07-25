import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BeatBoard } from "@/components/beats/BeatBoard";
import { loadStructureProjection } from "@/lib/beats/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StructurePage({ params }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${projectId}/structure`);

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

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
        <Link href={`/projects/${projectId}`}>{project.title}</Link> · Structure
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
