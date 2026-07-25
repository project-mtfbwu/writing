import Link from "next/link";

type FormulaStackProps = {
  levels: Array<{
    level: number;
    title: string;
    conceptId: string | null;
    formulas: Array<{ text: string; href: string }>;
    href: string;
  }>;
};

export function FormulaStack({ levels }: FormulaStackProps) {
  return (
    <section className="atlas-formulas" aria-label="Formula stack">
      <h2>Formula Stack</h2>
      <p className="atlas-muted">
        Source formulas from <code>14. The formulas</code>, grouped by level. Terminology preserved.
      </p>
      <ol className="atlas-formulas__levels">
        {levels.map((level) => (
          <li key={level.level}>
            <header>
              <h3>
                <Link href={level.href}>{level.title}</Link>
              </h3>
              {level.conceptId ? (
                <Link className="atlas-pill" href={`/atlas/${level.conceptId}`}>
                  Atlas concept
                </Link>
              ) : null}
            </header>
            {level.formulas.length === 0 ? (
              <p className="atlas-muted">No formula blocks in this section.</p>
            ) : (
              level.formulas.map((formula) => (
                <pre key={formula.href + formula.text.slice(0, 24)} className="atlas-formula">
                  <Link href={formula.href}>Open in book</Link>
                  {"\n"}
                  {formula.text}
                </pre>
              ))
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
