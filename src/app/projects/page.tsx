import Link from "next/link";
import { MigrateAnonymousOnMount } from "@/components/auth/MigrateAnonymousOnMount";
import { signOutAction } from "@/lib/auth/actions";
import { requireWritingAccess } from "@/lib/demo/access";
import { demoListProjects } from "@/lib/demo/repository";
import { endDemoSessionAction } from "@/lib/demo/session";
import { DEMO_TEST_ID } from "@/lib/demo/constants";

export default async function ProjectsIndexPage() {
  const access = await requireWritingAccess("/projects");

  if (access.mode === "demo") {
    const projects = await demoListProjects();
    return (
      <main className="project-page">
        <header className="project-page__header">
          <p className="atlas__kicker">
            <Link href="/">Home</Link> · Projects · Test mode
          </p>
          <h1>Your projects</h1>
          <p className="atlas-muted">
            Signed in as Test ID <code>{DEMO_TEST_ID}</code>. Writing is saved in this browser only.
          </p>
          <div className="project-page__actions">
            <Link className="learn-cta" href="/projects/new">
              New project
            </Link>
            <form action={endDemoSessionAction}>
              <button type="submit">End test session</button>
            </form>
          </div>
        </header>
        {projects.length === 0 ? (
          <p className="atlas-muted">No projects yet. Create one to start premise and character work.</p>
        ) : (
          <ul className="project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`}>
                  <strong>{project.title}</strong>
                  <span>
                    {project.format} · {project.status} · updated{" "}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  const { data: projects } = await access.supabase
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
