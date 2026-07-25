import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScreenplayEditor } from "@/components/screenplay/ScreenplayEditor";
import { loadStructureProjection } from "@/lib/beats/actions";
import { loadScreenplayDocument } from "@/lib/screenplay/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ draft?: string }>;
};

export default async function ScreenplayPage({ params, searchParams }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${projectId}/screenplay`);

  let document;
  try {
    document = await loadScreenplayDocument(projectId, query.draft);
  } catch (error) {
    return (
      <main className="project-page">
        <p className="auth-error">
          {error instanceof Error ? error.message : "Could not load screenplay."}
        </p>
      </main>
    );
  }

  if (!document.project) notFound();
  const structure = await loadStructureProjection(projectId);

  return (
    <main className="project-page project-page--wide">
      <p className="atlas__kicker">
        <Link href={`/projects/${projectId}`}>{document.project.title}</Link> · Screenplay
      </p>
      <h1>Screenplay</h1>
      <nav className="project-nav">
        <Link href={`/projects/${projectId}/structure`}>Structure</Link>
        <Link href={`/projects/${projectId}/scenes`}>Scenes</Link>
        <Link href={`/projects/${projectId}/scene-lab`}>Scene Lab</Link>
      </nav>
      <ScreenplayEditor
        projectId={projectId}
        projectTitle={document.project.title}
        userId={document.userId}
        draft={{
          id: document.draft.id,
          title: document.draft.title,
          revision: document.draft.revision ?? 1,
          updated_at: document.draft.updated_at,
          created_at: document.draft.created_at,
        }}
        drafts={document.drafts.map((item) => ({
          id: item.id,
          title: item.title,
          revision: item.revision ?? 1,
          updated_at: item.updated_at,
          created_at: item.created_at,
        }))}
        currentDraftId={document.project.current_draft_id}
        initialElements={document.elements}
        beats={structure.beats}
        scenes={structure.scenes}
        characterNames={document.characterNames}
      />
    </main>
  );
}
