"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DEMO_SESSION_COOKIE,
  DEMO_TEST_ID,
  DEMO_USER_ID,
} from "@/lib/demo/constants";
import {
  clearDemoStore,
  emptyDemoStore,
  newId,
  nowIso,
  readDemoStore,
  writeDemoStore,
  type DemoStore,
} from "@/lib/demo/store";

function seedStarterProject(store: DemoStore): DemoStore {
  if (store.projects.length > 0) return store;
  const projectId = newId();
  const draftId = newId();
  const stamp = nowIso();
  return {
    ...store,
    projects: [
      {
        id: projectId,
        ownerId: DEMO_USER_ID,
        title: "Demo feature",
        format: "feature",
        genre: "Drama",
        tone: "Intimate",
        status: "draft",
        logline: "",
        controllingIdea: "",
        currentDraftId: draftId,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    premises: [
      {
        projectId,
        title: "Demo feature",
        format: "feature",
        genre: "Drama",
        tone: "Intimate",
        protagonist: "",
        incitingIncident: "",
        goal: "",
        stakes: "",
        obstacle: "",
        controllingIdea: "",
      },
    ],
    drafts: [
      {
        id: draftId,
        projectId,
        title: "Draft 1",
        body: "",
        version: 1,
        revision: 1,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
  };
}

export async function startDemoSessionAction(formData: FormData): Promise<void> {
  const nextRaw = String(formData.get("next") ?? "/projects");
  const next = nextRaw.startsWith("/") ? nextRaw : "/projects";

  const jar = await cookies();
  jar.set(DEMO_SESSION_COOKIE, DEMO_TEST_ID, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  const existing = await readDemoStore();
  const seeded = seedStarterProject(
    existing.projects.length > 0 ? existing : emptyDemoStore(DEMO_USER_ID),
  );
  await writeDemoStore(seeded);
  redirect(next);
}

export async function endDemoSessionAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
  await clearDemoStore();
  redirect("/");
}
