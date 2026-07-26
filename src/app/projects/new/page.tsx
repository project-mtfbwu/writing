import Link from "next/link";
import { NewProjectForm } from "@/components/projects/NewProjectForm";
import { requireWritingAccess } from "@/lib/demo/access";

export default async function NewProjectPage() {
  await requireWritingAccess("/projects/new");
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
