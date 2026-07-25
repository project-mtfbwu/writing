import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${projectId}`);

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  return (
    <main className="project-page">
      <p className="atlas__kicker">
        <Link href="/projects">Projects</Link>
      </p>
      <h1>{project.title}</h1>
      <p className="atlas-muted">
        {project.format} · {project.genre || "no genre"} · {project.status}
      </p>
      <p>{project.logline || "No logline yet."}</p>
      <p className="atlas-muted">
        Created {new Date(project.created_at).toLocaleString()} · Updated{" "}
        {new Date(project.updated_at).toLocaleString()}
      </p>
      <nav className="project-nav">
        <Link href={`/projects/${project.id}/premise`}>Premise</Link>
        <Link href={`/projects/${project.id}/characters`}>Characters</Link>
        <Link href={`/projects/${project.id}/structure`}>Structure</Link>
        <Link href={`/projects/${project.id}/beats`}>Beats</Link>
        <Link href={`/projects/${project.id}/scenes`}>Scenes</Link>
      </nav>
    </main>
  );
}
