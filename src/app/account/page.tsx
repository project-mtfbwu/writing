import Link from "next/link";
import { AccountPanel } from "@/components/account/AccountPanel";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  let signedIn = false;
  let projects: Array<{ id: string; title: string }> = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedIn = Boolean(user);
      if (user) {
        const { data } = await supabase
          .from("projects")
          .select("id, title")
          .eq("owner_id", user.id)
          .order("updated_at", { ascending: false });
        projects = data ?? [];
      }
    } catch {
      signedIn = false;
    }
  }

  return (
    <main className="project-page">
      <h1>Account & data</h1>
      <p className="atlas-muted">
        Export your work, clear local progress, delete a project, or request account deletion.
      </p>
      {!signedIn ? (
        <p>
          <Link href="/login?next=/account">Sign in</Link> for project export and account requests.
        </p>
      ) : null}
      <AccountPanel signedIn={signedIn} projects={projects} />
    </main>
  );
}
