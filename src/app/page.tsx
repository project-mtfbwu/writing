const navItems = [
  { label: "Read", href: "/read" },
  { label: "Library", href: "/library" },
  { label: "Learn", href: "/learn" },
  { label: "Atlas", href: "/atlas" },
  { label: "Write", href: "/projects" },
  { label: "Test", href: "/projects" },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 px-6 py-20">
      <header className="space-y-4">
        <p className="font-serif text-5xl tracking-tight text-foreground sm:text-6xl">Writing</p>
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Read craft as a book, learn it as a course, navigate it as an atlas, and apply it in your
          own screenplay projects — from one Markdown source of truth.
        </p>
      </header>

      <nav aria-label="Primary" className="flex flex-wrap gap-3">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="border border-border bg-surface px-5 py-3 text-sm font-medium tracking-wide text-foreground transition hover:border-accent hover:bg-accent-soft"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
