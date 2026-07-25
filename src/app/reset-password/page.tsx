import Link from "next/link";
import { AuthConfigNotice, ResetRequestForm, UpdatePasswordForm } from "@/components/auth/AuthForms";

type PageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const updating = params.mode === "update";
  return (
    <main className="auth-page">
      <p className="atlas__kicker">
        <Link href="/login">Sign in</Link>
      </p>
      <h1>{updating ? "Choose a new password" : "Reset password"}</h1>
      <AuthConfigNotice />
      {updating ? <UpdatePasswordForm /> : <ResetRequestForm />}
    </main>
  );
}
