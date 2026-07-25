import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PremiseBuilder } from "@/components/projects/PremiseBuilder";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PremisePage({ params }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${projectId}/premise`);

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { data: premise } = await supabase
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
