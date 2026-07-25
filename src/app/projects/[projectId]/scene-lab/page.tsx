import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SceneLab } from "@/components/scene-lab/SceneLab";
import { loadSceneLabDocument } from "@/lib/scene-lab/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ scene?: string }>;
};

export default async function SceneLabPage({ params, searchParams }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${projectId}/scene-lab`);

  let document;
  try {
    document = await loadSceneLabDocument(projectId, query.scene);
  } catch (error) {
    return (
      <main className="project-page">
        <p className="auth-error">
          {error instanceof Error ? error.message : "Could not load Scene Lab."}
        </p>
      </main>
    );
  }

  if (!document.project) notFound();

  return (
    <main className="project-page project-page--wide">
      <p className="atlas__kicker">
        <Link href={`/projects/${projectId}`}>{document.project.title}</Link> · Scene Lab
      </p>
      <h1>Scene Lab</h1>
      <nav className="project-nav">
        <Link href={`/projects/${projectId}/structure`}>Structure</Link>
        <Link href={`/projects/${projectId}/scenes`}>Scenes</Link>
        <Link href={`/projects/${projectId}/screenplay`}>Screenplay</Link>
      </nav>
      <SceneLab
        projectId={projectId}
        projectTitle={document.project.title}
        userId={document.userId}
        beats={document.beats}
        scenes={document.scenes}
        initialSceneId={document.activeScene?.id ?? null}
        initialMicroBeats={document.microBeats}
        initialFindings={document.findings}
      />
    </main>
  );
}
