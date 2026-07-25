import Link from "next/link";
import { redirect } from "next/navigation";
import { NewProjectForm } from "@/components/projects/NewProjectForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NewProjectPage() {
  if (!isSupabaseConfigured()) redirect("/login?reason=supabase-unconfigured");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/projects/new");

  return (
    <main className="project-page">
      <p className="atlas__kicker">
        <Link href="/projects">Projects</Link> · New
      </p>
      <h1>New project</h1>
      <NewProjectForm />
    </main>
  );
}
