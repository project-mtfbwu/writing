import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CharacterBuilder } from "@/components/projects/CharacterBuilder";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function CharactersPage({ params }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${projectId}/characters`);

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .eq("project_id", projectId)
    .order("name");

  return (
    <main className="project-page">
      <p className="atlas__kicker">
        <Link href={`/projects/${projectId}`}>{project.title}</Link> · Characters
      </p>
      <h1>Character builder</h1>
      <CharacterBuilder
        projectId={projectId}
        initialCharacters={(characters ?? []).map((character) => ({
          id: character.id,
          name: character.name,
          role: character.role,
          want: character.want,
          need: character.need,
          wound: character.wound,
          lie: character.lie,
          arc: character.arc,
          method: character.method,
          relationshipToTheme: character.relationship_to_theme,
          register: character.register,
          notes: character.notes,
        }))}
      />
    </main>
  );
}
