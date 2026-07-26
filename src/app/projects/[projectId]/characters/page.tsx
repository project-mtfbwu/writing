import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterBuilder } from "@/components/projects/CharacterBuilder";
import { requireWritingAccess } from "@/lib/demo/access";
import { demoGetProject, demoListCharacters } from "@/lib/demo/repository";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function CharactersPage({ params }: PageProps) {
  const { projectId } = await params;
  const access = await requireWritingAccess(`/projects/${projectId}/characters`);

  if (access.mode === "demo") {
    const project = await demoGetProject(projectId);
    if (!project) notFound();
    const characters = await demoListCharacters(projectId);
    return (
      <main className="project-page">
        <p className="atlas__kicker">
          <Link href={`/projects/${projectId}`}>{project.title}</Link> · Characters · Test mode
        </p>
        <h1>Character builder</h1>
        <CharacterBuilder
          projectId={projectId}
          initialCharacters={characters.map((character) => ({
            id: character.id,
            name: character.name,
            role: character.role,
            want: character.want,
            need: character.need,
            wound: character.wound,
            lie: character.lie,
            arc: character.arc,
            method: character.method,
            relationshipToTheme: character.relationshipToTheme,
            register: character.register,
            notes: character.notes,
          }))}
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

  const { data: characters } = await access.supabase
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
