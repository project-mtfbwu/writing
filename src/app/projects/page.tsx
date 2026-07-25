import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { MigrateAnonymousOnMount } from "@/components/auth/MigrateAnonymousOnMount";
import { signOutAction } from "@/lib/auth/actions";

export default async function ProjectsIndexPage() {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/projects");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, format, genre, status, updated_at, created_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="project-page">
      <MigrateAnonymousOnMount />
      <header className="project-page__header">
        <p className="atlas__kicker">
          <Link href="/">Home</Link> · Projects
        </p>
        <h1>Your projects</h1>
        <div className="project-page__actions">
          <Link className="learn-cta" href="/projects/new">
            New project
          </Link>
          <form action={signOutAction}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </header>
      {(projects ?? []).length === 0 ? (
        <p className="atlas-muted">No projects yet. Create one to start premise and character work.</p>
      ) : (
        <ul className="project-list">
          {(projects ?? []).map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`}>
                <strong>{project.title}</strong>
                <span>
                  {project.format} · {project.status} · updated{" "}
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
