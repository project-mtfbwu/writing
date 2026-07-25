"use client";

import type { ContentBlock, EvidenceLabel } from "@/types/content";
import { showsEvidenceBadges } from "@/lib/reader/modes";
import type { ReadingDepth } from "@/lib/reader/modes";
import {
  BadExample,
  BetterExample,
  CommonMistake,
  Definition,
  ELI5,
  Evidence,
  Formula,
  RealWorldExample,
  SecretSauce,
  SourceNote,
  TryIt,
} from "@/components/reader/callouts";
import { EvidenceBadge } from "@/components/reader/EvidenceBadge";

type BlockRendererProps = {
  block: ContentBlock;
  depth: ReadingDepth;
};

function Html({ html }: { html: string }) {
  return <div className="reader-html" dangerouslySetInnerHTML={{ __html: html }} />;
}

function RichTextWithBadges({ html, depth }: { html: string; depth: ReadingDepth }) {
  if (!showsEvidenceBadges(depth)) {
    return <Html html={html} />;
  }

  const parts = html.split(/(\[E[1-5]\])/g);
  return (
    <div className="reader-html">
      {parts.map((part, index) => {
        const match = /^\[(E[1-5])\]$/.exec(part);
        if (match) {
          return <EvidenceBadge key={`${match[1]}-${index}`} label={match[1] as EvidenceLabel} />;
        }
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
      })}
    </div>
  );
}

function CalloutFromBlock({
  block,
  depth,
}: {
  block: Extract<ContentBlock, { type: "callout" }>;
  depth: ReadingDepth;
}) {
  const body = <RichTextWithBadges html={block.html} depth={depth} />;

  switch (block.kind) {
    case "secret-sauce":
      return <SecretSauce title={block.title}>{body}</SecretSauce>;
    case "eli5":
      return <ELI5 title={block.title}>{body}</ELI5>;
    case "real-world":
      return <RealWorldExample title={block.title}>{body}</RealWorldExample>;
    case "evidence":
      return <Evidence title={block.title}>{body}</Evidence>;
    case "formula":
      return (
        <Formula title={block.title}>
          <pre className="reader-formula">{block.text}</pre>
        </Formula>
      );
    case "bad":
      return <BadExample title={block.title}>{body}</BadExample>;
    case "better":
      return <BetterExample title={block.title}>{body}</BetterExample>;
    case "try-it":
      return <TryIt title={block.title}>{body}</TryIt>;
    case "common-mistake":
      return <CommonMistake title={block.title}>{body}</CommonMistake>;
    case "definition":
      return <Definition title={block.title}>{body}</Definition>;
    case "source":
      return <SourceNote title={block.title}>{body}</SourceNote>;
    default:
      return null;
  }
}

export function BlockRenderer({ block, depth }: BlockRendererProps) {
  switch (block.type) {
    case "heading":
      if (block.depth <= 2) {
        return (
          <h2 id={block.headingId} className="reader-h2" data-section-id={block.sectionId}>
            {block.title}
          </h2>
        );
      }
      if (block.depth === 3) {
        return (
          <h3 id={block.headingId} className="reader-h3" data-section-id={block.sectionId}>
            {block.title}
          </h3>
        );
      }
      return (
        <h4 id={block.headingId} className="reader-h4" data-section-id={block.sectionId}>
          {block.title}
        </h4>
      );
    case "paragraph":
      return (
        <div data-block-id={block.id} data-section-id={block.sectionId} className="reader-prose-p">
          <RichTextWithBadges html={block.html} depth={depth} />
        </div>
      );
    case "list":
      return (
        <div
          data-block-id={block.id}
          className="reader-list"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "table":
      return (
        <div
          data-block-id={block.id}
          className="reader-table-wrap print:break-inside-avoid"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "code":
      return (
        <pre data-block-id={block.id} className="reader-code">
          <code>{block.value}</code>
        </pre>
      );
    case "formula":
      return (
        <Formula>
          <pre className="reader-formula">{block.text}</pre>
        </Formula>
      );
    case "quote":
      return (
        <blockquote data-block-id={block.id} className="reader-quote">
          <RichTextWithBadges html={block.html} depth={depth} />
        </blockquote>
      );
    case "callout":
      return <CalloutFromBlock block={block} depth={depth} />;
    case "exercise":
      return (
        <TryIt>
          <Html html={block.html} />
        </TryIt>
      );
    case "thematic-break":
      return <hr className="reader-hr" />;
    default:
      return null;
  }
}
