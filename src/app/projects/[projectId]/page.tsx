import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWritingAccess } from "@/lib/demo/access";
import { demoGetProject } from "@/lib/demo/repository";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;
  const access = await requireWritingAccess(`/projects/${projectId}`);

  if (access.mode === "demo") {
    const project = await demoGetProject(projectId);
    if (!project) notFound();
    return (
      <main className="project-page">
        <p className="atlas__kicker">
          <Link href="/projects">Projects</Link> · Test mode
        </p>
        <h1>{project.title}</h1>
        <p className="atlas-muted">
          {project.format} · {project.genre || "no genre"} · {project.status}
        </p>
        <p>{project.logline || "No logline yet."}</p>
        <p className="atlas-muted">
          Created {new Date(project.createdAt).toLocaleString()} · Updated{" "}
          {new Date(project.updatedAt).toLocaleString()}
        </p>
        <nav className="project-nav">
          <Link href={`/projects/${project.id}/premise`}>Premise</Link>
          <Link href={`/projects/${project.id}/characters`}>Characters</Link>
          <Link href={`/projects/${project.id}/structure`}>Structure</Link>
          <Link href={`/projects/${project.id}/beats`}>Beats</Link>
          <Link href={`/projects/${project.id}/scenes`}>Scenes</Link>
          <Link href={`/projects/${project.id}/scene-lab`}>Scene Lab</Link>
          <Link href={`/projects/${project.id}/screenplay`}>Screenplay</Link>
        </nav>
      </main>
    );
  }

  const { data: project } = await access.supabase
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
        <Link href={`/projects/${project.id}/scene-lab`}>Scene Lab</Link>
        <Link href={`/projects/${project.id}/screenplay`}>Screenplay</Link>
      </nav>
    </main>
  );
}
