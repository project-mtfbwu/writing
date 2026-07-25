import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function BeatsPage({ params }: PageProps) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/structure`);
}
