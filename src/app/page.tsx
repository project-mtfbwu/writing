import Link from "next/link";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadServerDashboard() {
  const { isDemoSession } = await import("@/lib/demo/session-state");
  if (await isDemoSession()) {
    const { demoListProjects } = await import("@/lib/demo/repository");
    const projects = await demoListProjects();
    const current = projects[0] ?? null;
    return {
      currentProject: current ? { id: current.id, title: current.title } : null,
      nextStructuralAction: current
        ? `Continue writing “${current.title}” in test mode`
        : "Create a project in test mode",
      unresolvedFindingCount: null,
      supabaseConfigured: false,
      demoMode: true,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      currentProject: null,
      nextStructuralAction: null,
      unresolvedFindingCount: null,
      supabaseConfigured: false,
      demoMode: false,
    };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        currentProject: null,
        nextStructuralAction: "Sign in to continue a project",
        unresolvedFindingCount: null,
        supabaseConfigured: true,
        demoMode: false,
      };
    }

    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, current_draft_id, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);
    const current = projects?.[0] ?? null;

    let nextStructuralAction: string | null = null;
    let unresolvedFindingCount: number | null = 0;
    if (current) {
      const draftId = current.current_draft_id;
      if (!draftId) {
        nextStructuralAction = "Open Structure and ensure a draft exists";
      } else {
        const [{ count: beatCount }, { count: sceneCount }, { count: openFindings }] =
          await Promise.all([
            supabase
              .from("beats")
              .select("id", { count: "exact", head: true })
              .eq("draft_id", draftId),
            supabase
              .from("scenes")
              .select("id", { count: "exact", head: true })
              .eq("draft_id", draftId),
            supabase
              .from("scene_review_findings")
              .select("id", { count: "exact", head: true })
              .eq("project_id", current.id)
              .eq("status", "open"),
          ]);
        unresolvedFindingCount = openFindings ?? 0;
        if ((beatCount ?? 0) === 0) {
          nextStructuralAction = `Add beats on Structure for “${current.title}”`;
        } else if ((sceneCount ?? 0) === 0) {
          nextStructuralAction = `Create a scene for “${current.title}”`;
        } else {
          const { count: unassigned } = await supabase
            .from("scenes")
            .select("id", { count: "exact", head: true })
            .eq("draft_id", draftId)
            .is("beat_id", null);
          if ((unassigned ?? 0) > 0) {
            nextStructuralAction = `Assign ${unassigned} scene(s) to beats`;
          } else {
            nextStructuralAction = `Continue screenplay or Scene Lab for “${current.title}”`;
          }
        }
      }
    }

    return {
      currentProject: current ? { id: current.id, title: current.title } : null,
      nextStructuralAction,
      unresolvedFindingCount,
      supabaseConfigured: true,
      demoMode: false,
    };
  } catch {
    return {
      currentProject: null,
      nextStructuralAction: "Could not reach projects — retry later",
      unresolvedFindingCount: null,
      supabaseConfigured: true,
      demoMode: false,
    };
  }
}

export default async function HomePage() {
  const server = await loadServerDashboard();

  return (
    <main className="home-page">
      <header className="home-page__hero">
        <h1>Writing</h1>
        <p>
          Read craft as a book, learn it as a course, navigate it as an atlas, and apply it in your
          own screenplay projects — from one Markdown source of truth.
        </p>
      </header>
      <HomeDashboard server={server} />
      <p className="home-page__links">
        <Link href="/reference">Reference</Link>
        <Link href="/account">Account & data</Link>
      </p>
    </main>
  );
}
