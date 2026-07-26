import Link from "next/link";
import { notFound } from "next/navigation";
import { PremiseBuilder } from "@/components/projects/PremiseBuilder";
import { requireWritingAccess } from "@/lib/demo/access";
import { demoGetPremise, demoGetProject } from "@/lib/demo/repository";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PremisePage({ params }: PageProps) {
  const { projectId } = await params;
  const access = await requireWritingAccess(`/projects/${projectId}/premise`);

  if (access.mode === "demo") {
    const project = await demoGetProject(projectId);
    if (!project) notFound();
    const premise = await demoGetPremise(projectId);
    return (
      <main className="project-page">
        <p className="atlas__kicker">
          <Link href={`/projects/${projectId}`}>{project.title}</Link> · Premise · Test mode
        </p>
        <h1>Premise builder</h1>
        <PremiseBuilder
          projectId={projectId}
          initial={{
            title: premise?.title ?? project.title,
            format: premise?.format ?? "feature",
            genre: premise?.genre ?? "",
            tone: premise?.tone ?? "",
            protagonist: premise?.protagonist ?? "",
            incitingIncident: premise?.incitingIncident ?? "",
            goal: premise?.goal ?? "",
            stakes: premise?.stakes ?? "",
            obstacle: premise?.obstacle ?? "",
            controllingIdea: premise?.controllingIdea ?? "",
          }}
        />
      </main>
    );
  }

  const { data: project } = await access.supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { data: premise } = await access.supabase
    .from("premises")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  return (
    <main className="project-page">
      <p className="atlas__kicker">
        <Link href={`/projects/${projectId}`}>{project.title}</Link> · Premise
      </p>
      <h1>Premise builder</h1>
      <PremiseBuilder
        projectId={projectId}
        initial={{
          title: premise?.title ?? project.title,
          format: premise?.format ?? "feature",
          genre: premise?.genre ?? "",
          tone: premise?.tone ?? "",
          protagonist: premise?.protagonist ?? "",
          incitingIncident: premise?.inciting_incident ?? "",
          goal: premise?.goal ?? "",
          stakes: premise?.stakes ?? "",
          obstacle: premise?.obstacle ?? "",
          controllingIdea: premise?.controlling_idea ?? "",
        }}
      />
    </main>
  );
}
