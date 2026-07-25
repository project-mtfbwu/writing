import Link from "next/link";
import { AuthConfigNotice, SignUpForm } from "@/components/auth/AuthForms";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <p className="atlas__kicker">
        <Link href="/">Home</Link>
      </p>
      <h1>Create account</h1>
      <AuthConfigNotice />
      <SignUpForm />
    </main>
  );
}
