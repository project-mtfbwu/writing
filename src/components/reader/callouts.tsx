"use client";

import { useId, useState, type ReactNode } from "react";
import type { CalloutKind } from "@/types/content";

const LABELS: Record<CalloutKind, string> = {
  "secret-sauce": "Secret Sauce",
  eli5: "ELI5",
  "real-world": "Real World",
  evidence: "Evidence",
  formula: "Formula",
  bad: "Bad",
  better: "Better",
  "try-it": "Try It",
  "common-mistake": "Common Mistake",
  definition: "Definition",
  source: "Source",
};

type CalloutShellProps = {
  kind: CalloutKind;
  title?: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
};

export function CalloutShell({
  kind,
  title,
  children,
  className = "",
  defaultOpen = true,
  collapsible = true,
}: CalloutShellProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const label = title ? `${LABELS[kind]}: ${title}` : LABELS[kind];

  return (
    <aside
      className={`reader-callout reader-callout--${kind} print:break-inside-avoid ${className}`}
      data-callout={kind}
      aria-label={label}
    >
      {collapsible ? (
        <button
          type="button"
          className="reader-callout__toggle print:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="reader-callout__label">{LABELS[kind]}</span>
          {title ? <span className="reader-callout__title">{title}</span> : null}
          <span className="reader-callout__chevron" aria-hidden>
            {open ? "−" : "+"}
          </span>
        </button>
      ) : (
        <div className="reader-callout__header">
          <span className="reader-callout__label">{LABELS[kind]}</span>
          {title ? <span className="reader-callout__title">{title}</span> : null}
        </div>
      )}
      <div className="reader-callout__label print-only print:block hidden" aria-hidden>
        {LABELS[kind]}
        {title ? ` — ${title}` : ""}
      </div>
      {open || !collapsible ? (
        <div id={panelId} className="reader-callout__body">
          {children}
        </div>
      ) : (
        <div id={panelId} hidden className="reader-callout__body">
          {children}
        </div>
      )}
    </aside>
  );
}

export function SecretSauce(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="secret-sauce" {...props} />;
}
export function ELI5(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="eli5" {...props} />;
}
export function RealWorldExample(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="real-world" {...props} />;
}
export function Evidence(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="evidence" {...props} />;
}
export function Formula(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="formula" collapsible={false} {...props} />;
}
export function BadExample(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="bad" {...props} />;
}
export function BetterExample(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="better" {...props} />;
}
export function TryIt(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="try-it" {...props} />;
}
export function CommonMistake(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="common-mistake" {...props} />;
}
export function Definition(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="definition" {...props} />;
}
export function SourceNote(props: Omit<CalloutShellProps, "kind">) {
  return <CalloutShell kind="source" {...props} />;
}
