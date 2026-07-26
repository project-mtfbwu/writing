import Link from "next/link";
import { isDemoSession } from "@/lib/demo/session-state";
import { demoListProjects } from "@/lib/demo/repository";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Test hub — Scene Lab entry points. Does not invent craft content.
 */
export default async function TestHubPage() {
  if (await isDemoSession()) {
    const projects = await demoListProjects();
    return (
      <main className="project-page">
        <h1>Test</h1>
        <p>Test mode is on. Open Scene Lab for a demo project.</p>
        {projects.length === 0 ? (
          <p className="atlas-muted">
            No projects yet. <Link href="/projects/new">Create a project</Link>
          </p>
        ) : (
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}/scene-lab`}>{project.title} · Scene Lab</Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="project-page">
        <h1>Test</h1>
        <p className="atlas-muted">
          Scene Lab needs a session. Use Test ID login when Supabase is not configured, then open a
          project in Scene Lab.
        </p>
        <Link href="/login?next=/test">Sign in with Test ID</Link>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="project-page">
        <h1>Test</h1>
        <p className="atlas-muted">Sign in to open Scene Lab for your projects.</p>
        <Link href="/login?next=/test">Sign in</Link>
      </main>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <main className="project-page">
      <h1>Test</h1>
      <p>Open Scene Lab for a project. Rule-based review never invents an overall score.</p>
      {(projects ?? []).length === 0 ? (
        <p className="atlas-muted">
          No projects yet. <Link href="/projects/new">Create a project</Link>
        </p>
      ) : (
        <ul>
          {(projects ?? []).map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}/scene-lab`}>{project.title} · Scene Lab</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
