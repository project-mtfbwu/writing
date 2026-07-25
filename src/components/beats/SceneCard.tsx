"use client";

import Link from "next/link";
import { sceneCardView } from "@/lib/beats/map";
import type { Scene } from "@/lib/beats/order";

type SceneCardProps = {
  scene: Scene;
  projectId: string;
  compact?: boolean;
};

export function SceneCard({ scene, projectId, compact = false }: SceneCardProps) {
  const view = sceneCardView(scene);
  return (
    <article className={`beat-scene-card${compact ? " is-compact" : ""}`} data-scene-id={scene.id}>
      <header>
        <Link href={`/projects/${projectId}/scenes?scene=${scene.id}`}>{view.heading}</Link>
        {" · "}
        <Link href={`/projects/${projectId}/scene-lab?scene=${scene.id}`}>Scene Lab</Link>
        {" · "}
        <Link href={`/projects/${projectId}/screenplay`}>Screenplay</Link>
      </header>
      <p className="beat-scene-card__summary">{view.summary}</p>
      <dl className="beat-scene-card__meta">
        <div>
          <dt>Charge in</dt>
          <dd data-state={view.chargeIn === "incomplete" ? "incomplete" : "set"}>
            {view.chargeIn === "incomplete" ? "—" : view.chargeIn}
          </dd>
        </div>
        <div>
          <dt>Charge out</dt>
          <dd data-state={view.chargeOut === "incomplete" ? "incomplete" : "set"}>
            {view.chargeOut === "incomplete" ? "—" : view.chargeOut}
          </dd>
        </div>
        <div>
          <dt>Turn</dt>
          <dd data-state={view.turnStatus}>{view.turnStatus}</dd>
        </div>
        <div>
          <dt>Object</dt>
          <dd data-state={view.objectStatus}>{view.objectStatus}</dd>
        </div>
        <div>
          <dt>Est. pages</dt>
          <dd data-state={view.estimatedPages === "incomplete" ? "incomplete" : "set"}>
            {view.estimatedPages === "incomplete" ? "—" : view.estimatedPages}
          </dd>
        </div>
        <div>
          <dt>Warnings</dt>
          <dd>{view.warningCount}</dd>
        </div>
      </dl>
    </article>
  );
}
