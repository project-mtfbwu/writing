"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createUserDataStore } from "@/lib/storage/local";
import { loadLearningProgress } from "@/lib/learning/progress";
import { loadCurriculum } from "@/lib/learning/catalog";

type ServerDash = {
  currentProject: { id: string; title: string } | null;
  nextStructuralAction: string | null;
  unresolvedFindingCount: number | null;
  supabaseConfigured: boolean;
};

type LocalDash = {
  continueReading: { href: string; label: string } | null;
  continueLearning: { href: string; label: string } | null;
  recentBookmarks: Array<{ href: string; label: string }>;
  recentNotes: Array<{ href: string; label: string }>;
};

export function HomeDashboard({ server }: { server: ServerDash }) {
  const [local, setLocal] = useState<LocalDash>({
    continueReading: null,
    continueLearning: null,
    recentBookmarks: [],
    recentNotes: [],
  });

  useEffect(() => {
    async function load() {
      const store = createUserDataStore();
      const [recent, bookmarks, notes] = await Promise.all([
        store.listRecent(),
        store.listBookmarks(),
        store.listNotes(),
      ]);
      const progress = loadLearningProgress();
      const curriculum = loadCurriculum();
      const playhead = progress.playheadLessonId
        ? curriculum.lessons.find((lesson) => lesson.id === progress.playheadLessonId)
        : curriculum.lessons.find(
            (lesson) => !progress.lessons.some((item) => item.lessonId === lesson.id && item.completedAt),
          );

      setLocal({
        continueReading: recent[0]
          ? {
              href: `/read/${recent[0].bookId}/${recent[0].chapterSlug}`,
              label: `${recent[0].bookTitle} · ${recent[0].chapterTitle}`,
            }
          : null,
        continueLearning: playhead
          ? {
              href: `/learn/screenwriting-craft/${playhead.slug}`,
              label: playhead.title,
            }
          : { href: "/learn", label: "Start guided learning" },
        recentBookmarks: bookmarks.slice(0, 5).map((item) => ({
          href: item.href,
          label: item.sectionTitle || item.chapterTitle,
        })),
        recentNotes: notes.slice(0, 5).map((item) => ({
          href: item.href,
          label: item.sectionTitle || item.chapterTitle,
        })),
      });
    }
    void load();
  }, []);

  return (
    <section className="home-dash" aria-label="Continue working">
      <h2 className="sr-only">Useful next actions</h2>
      <ul className="home-dash__actions">
        <li>
          <p className="home-dash__label">Continue reading</p>
          {local.continueReading ? (
            <Link href={local.continueReading.href}>{local.continueReading.label}</Link>
          ) : (
            <Link href="/read">Open the library books</Link>
          )}
        </li>
        <li>
          <p className="home-dash__label">Continue learning</p>
          {local.continueLearning ? (
            <Link href={local.continueLearning.href}>{local.continueLearning.label}</Link>
          ) : (
            <Link href="/learn">Open the course</Link>
          )}
        </li>
        <li>
          <p className="home-dash__label">Continue writing</p>
          {server.currentProject ? (
            <Link href={`/projects/${server.currentProject.id}`}>
              {server.currentProject.title}
            </Link>
          ) : server.supabaseConfigured ? (
            <Link href="/projects">Open projects</Link>
          ) : (
            <p className="atlas-muted">Sign in and configure Supabase to write projects.</p>
          )}
        </li>
        <li>
          <p className="home-dash__label">Current project</p>
          {server.currentProject ? (
            <Link href={`/projects/${server.currentProject.id}`}>{server.currentProject.title}</Link>
          ) : (
            <span className="atlas-muted">None selected</span>
          )}
        </li>
        <li>
          <p className="home-dash__label">Next incomplete structural action</p>
          {server.nextStructuralAction ? (
            <span>{server.nextStructuralAction}</span>
          ) : (
            <span className="atlas-muted">No structural gap detected yet</span>
          )}
        </li>
        <li>
          <p className="home-dash__label">Unresolved review findings</p>
          {server.unresolvedFindingCount === null ? (
            <span className="atlas-muted">Unavailable until Scene Lab review runs</span>
          ) : (
            <span>{server.unresolvedFindingCount}</span>
          )}
        </li>
      </ul>

      <div className="home-dash__lists">
        <section>
          <h3>Recent bookmarks</h3>
          {local.recentBookmarks.length === 0 ? (
            <p className="atlas-muted">No bookmarks yet.</p>
          ) : (
            <ul>
              {local.recentBookmarks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3>Recent notes</h3>
          {local.recentNotes.length === 0 ? (
            <p className="atlas-muted">No notes yet.</p>
          ) : (
            <ul>
              {local.recentNotes.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
