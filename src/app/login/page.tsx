import Link from "next/link";
import { AuthConfigNotice, SignInForm } from "@/components/auth/AuthForms";
import { DemoLoginButton } from "@/components/auth/DemoLoginButton";
import { isDemoWritingAvailable } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type PageProps = {
  searchParams: Promise<{ next?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = params.next ?? "/projects";
  const showDemo = isDemoWritingAvailable();
  return (
    <main className="auth-page">
      <p className="atlas__kicker">
        <Link href="/">Home</Link>
      </p>
      <h1>Sign in</h1>
      <p>Email and password only. Social login is not enabled yet.</p>
      {params.reason === "supabase-unconfigured" ? (
        <p className="auth-error">
          Supabase is not configured here. Use Test ID below for the full writing experience, or add
          credentials for real accounts.
        </p>
      ) : null}
      {showDemo ? <DemoLoginButton next={next} /> : null}
      <AuthConfigNotice />
      {isSupabaseConfigured() ? <SignInForm next={next} /> : null}
    </main>
  );
}
