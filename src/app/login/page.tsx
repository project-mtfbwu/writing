import Link from "next/link";
import { AuthConfigNotice, SignInForm } from "@/components/auth/AuthForms";

type PageProps = {
  searchParams: Promise<{ next?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <p className="atlas__kicker">
        <Link href="/">Home</Link>
      </p>
      <h1>Sign in</h1>
      <p>Email and password only. Social login is not enabled yet.</p>
      {params.reason === "supabase-unconfigured" ? (
        <p className="auth-error">Projects require Supabase credentials.</p>
      ) : null}
      <AuthConfigNotice />
      <SignInForm next={params.next ?? "/projects"} />
    </main>
  );
}
