import Link from "next/link";
import type { ReactNode } from "react";
import type { AtlasConcept } from "@/types/atlas";
import type { ContentBlock } from "@/types/content";
import type { Exercise, Lesson } from "@/types/learning";
import type { LoadedSnippet, TopicExcerpt } from "@/lib/atlas/catalog";
import { sourceLocationHref } from "@/lib/atlas/catalog";

function BlockPreview({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) {
    return <p className="atlas-muted">No blocks loaded for this location.</p>;
  }
  return (
    <div className="atlas-blocks">
      {blocks.map((block) => {
        if (block.type === "formula" || block.type === "code") {
          return (
            <pre key={block.id} className="atlas-formula">
              {"text" in block ? block.text : ""}
            </pre>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={block.id}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "quote") {
          return <blockquote key={block.id}>{block.text}</blockquote>;
        }
        if (block.type === "heading") {
          return <h4 key={block.id}>{block.title}</h4>;
        }
        if ("text" in block && typeof block.text === "string" && block.text.trim()) {
          return <p key={block.id}>{block.text}</p>;
        }
        return null;
      })}
    </div>
  );
}

export type ConceptEverythingModel = {
  concept: AtlasConcept;
  snippets: LoadedSnippet[];
  eli5: TopicExcerpt[];
  secretSauce: TopicExcerpt[];
  lessons: Lesson[];
  exercises: Exercise[];
  connected: Array<{
    id: string;
    title: string;
    description: string;
    source: string;
  }>;
  evidenceLabels: string[];
};

type EverythingViewProps = {
  items: ConceptEverythingModel[];
};

export function EverythingView({ items }: EverythingViewProps) {
  return (
    <section className="atlas-everything" aria-label="Everything view">
      <h2>Everything View</h2>
      <p className="atlas-muted">
        Available layers only — missing layers stay empty rather than inventing content.
      </p>
      <div className="atlas-everything__stack">
        {items.map((item) => (
          <ConceptEverythingCard key={item.concept.id} model={item} />
        ))}
      </div>
    </section>
  );
}

export function ConceptEverythingCard({ model }: { model: ConceptEverythingModel }) {
  const { concept, snippets, eli5, secretSauce, lessons, exercises, connected, evidenceLabels } =
    model;
  const byRole = (role: string) => snippets.filter((snippet) => snippet.role === role);

  return (
    <article className="atlas-concept-card" id={`everything-${concept.id}`}>
      <header>
        <h3>
          <Link href={`/atlas/${concept.id}`}>{concept.title}</Link>
        </h3>
        <p>{concept.summary}</p>
      </header>

      <Layer title="Definition" empty="No dedicated definition section mapped.">
        {byRole("definition").map((snippet) => (
          <Snippet key={snippet.href + snippet.label} snippet={snippet} />
        ))}
      </Layer>

      <Layer title="Explanation" empty="No explanation section mapped.">
        {byRole("explanation").map((snippet) => (
          <Snippet key={snippet.href + snippet.label} snippet={snippet} />
        ))}
      </Layer>

      <Layer title="ELI5" empty="No ELI5 topic mapped for this concept.">
        {eli5.map((excerpt) => (
          <div key={excerpt.topic}>
            <p className="atlas-muted">
              <Link href={excerpt.href}>{excerpt.topic}</Link>
            </p>
            <p>{excerpt.text}</p>
          </div>
        ))}
      </Layer>

      <Layer title="Secret Sauce" empty="No Secret Sauce topic mapped for this concept.">
        {secretSauce.map((excerpt) => (
          <div key={excerpt.topic}>
            <p className="atlas-muted">
              <Link href={excerpt.href}>{excerpt.topic}</Link>
            </p>
            <p>{excerpt.text}</p>
          </div>
        ))}
      </Layer>

      <Layer title="Formula" empty="No formula blocks at mapped locations.">
        {byRole("formula").map((snippet) => (
          <Snippet key={snippet.href + snippet.label} snippet={snippet} formulasOnly />
        ))}
      </Layer>

      <Layer title="Real-world examples" empty="No example locations mapped.">
        {byRole("example").map((snippet) => (
          <Snippet key={snippet.href + snippet.label} snippet={snippet} />
        ))}
      </Layer>

      <Layer title="Bad / better examples" empty="No bad/better locations mapped.">
        {byRole("bad-better").map((snippet) => (
          <Snippet key={snippet.href + snippet.label} snippet={snippet} />
        ))}
      </Layer>

      <Layer title="Evidence" empty="No evidence labels on this concept.">
        {evidenceLabels.length > 0 ? (
          <p>{evidenceLabels.join(" · ")}</p>
        ) : null}
        {byRole("evidence").map((snippet) => (
          <Snippet key={snippet.href + snippet.label} snippet={snippet} />
        ))}
      </Layer>

      <Layer title="Lesson" empty="No course lesson linked.">
        {lessons.map((lesson) => (
          <p key={lesson.id}>
            <Link href={`/learn/screenwriting-craft/${lesson.slug}`}>{lesson.title}</Link>
          </p>
        ))}
      </Layer>

      <Layer title="Exercise" empty="No exercises linked.">
        {exercises.map((exercise) => (
          <p key={exercise.id}>
            <span className="atlas-pill">{exercise.type}</span> {exercise.prompt}
          </p>
        ))}
      </Layer>

      <Layer title="Source locations" empty="Missing sources.">
        <ul>
          {concept.sourceLocations.map((location) => (
            <li key={location.label + location.chapterSlug}>
              <Link href={sourceLocationHref(location)}>{location.label}</Link>
              <span className="atlas-muted"> · {location.role}</span>
            </li>
          ))}
        </ul>
      </Layer>

      <Layer title="Connected concepts" empty="No reviewed relationships.">
        <ul>
          {connected.map((item) => (
            <li key={item.id}>
              <Link href={`/atlas/${item.id}`}>{item.title}</Link>
              <span className="atlas-muted">
                {" "}
                — {item.description} ({item.source})
              </span>
            </li>
          ))}
        </ul>
      </Layer>

      <Layer title="Project application" empty="">
        <p className="atlas-placeholder">{concept.projectCheckPlaceholder}</p>
      </Layer>
    </article>
  );
}

function Layer({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const childArray = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  const hasContent = childArray.length > 0;
  return (
    <section className="atlas-layer">
      <h4>{title}</h4>
      {hasContent ? children : empty ? <p className="atlas-muted">{empty}</p> : null}
    </section>
  );
}

function Snippet({
  snippet,
  formulasOnly = false,
}: {
  snippet: LoadedSnippet;
  formulasOnly?: boolean;
}) {
  const blocks = formulasOnly
    ? snippet.blocks.filter((block) => block.type === "formula")
    : snippet.blocks;
  return (
    <div className="atlas-snippet">
      <p>
        <Link href={snippet.href}>{snippet.label}</Link>
      </p>
      <BlockPreview blocks={blocks} />
    </div>
  );
}
