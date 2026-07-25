import Link from "next/link";
import type { ReactNode } from "react";
import type { AtlasView, AtlasZoomLevel } from "@/types/atlas";

const VIEWS: Array<{ id: AtlasView; label: string }> = [
  { id: "system", label: "System Map" },
  { id: "matrix", label: "Track Matrix" },
  { id: "formulas", label: "Formula Stack" },
  { id: "evidence", label: "Evidence Map" },
  { id: "everything", label: "Everything View" },
];

const ZOOMS: Array<{ id: AtlasZoomLevel; label: string }> = [
  { id: "whole-system", label: "Whole system" },
  { id: "track", label: "Track" },
  { id: "module", label: "Module" },
  { id: "concept", label: "Concept" },
  { id: "project-application", label: "Project application" },
];

type AtlasShellProps = {
  activeView: AtlasView;
  zoom: AtlasZoomLevel;
  children: ReactNode;
  searchSlot?: ReactNode;
};

export function AtlasShell({ activeView, zoom, children, searchSlot }: AtlasShellProps) {
  return (
    <main className="atlas">
      <header className="atlas__header">
        <p className="atlas__kicker">
          <Link href="/">Home</Link> · Atlas
        </p>
        <h1>Screenwriting system</h1>
        <p className="atlas__lede">
          One map of the craft stack — source terminology only, relationships from hierarchy and
          reviewed mappings.
        </p>

        <nav className="atlas__views" aria-label="Atlas views">
          {VIEWS.map((view) => (
            <Link
              key={view.id}
              href={`/atlas?view=${view.id}&zoom=${zoom}`}
              className={view.id === activeView ? "is-active" : undefined}
              aria-current={view.id === activeView ? "page" : undefined}
            >
              {view.label}
            </Link>
          ))}
        </nav>

        <nav className="atlas__zooms" aria-label="Zoom level">
          {ZOOMS.map((item) => (
            <Link
              key={item.id}
              href={`/atlas?view=${activeView}&zoom=${item.id}`}
              className={item.id === zoom ? "is-active" : undefined}
              aria-current={item.id === zoom ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {searchSlot}
      </header>

      {children}
    </main>
  );
}
