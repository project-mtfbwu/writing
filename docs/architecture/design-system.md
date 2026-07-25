# Design system — Writing

## Intent

Support two simultaneous reading needs:

1. **Long-form comfort** — continuous chapters that feel like a commercial novel page.
2. **Technical handbook clarity** — O’Reilly-style explanations, sidebars, formulas, and callouts.

Do not imitate any author’s prose voice. The reference is comfort, flow, typography, and information design.

## Visual tokens (bootstrap)

| Token | Role | Bootstrap value |
|---|---|---|
| `--background` | Page atmosphere | Warm paper `#f7f4ef` with soft gradients |
| `--surface` | Reading panel | `#fffdf9` |
| `--foreground` | Body text | Stone `#1c1917` |
| `--muted` | Secondary text | `#57534e` |
| `--border` | Quiet rules | `#d6d0c6` |
| `--accent` | Focus / links / mode chrome | Deep teal `#0f3d3e` |
| `--accent-soft` | Hover wash | `#d8ecec` |

Avoid default AI aesthetic traps (generic purple gradients, glow stacks, dashboard chrome on reading surfaces).

## Typography

| Role | Family | Notes |
|---|---|---|
| Display / book titles | Literata (serif) | Chapter titles, product name |
| UI + handbook body | Source Sans 3 | Navigation, lessons, UI chrome |
| Formulas / code / screenplay | Monospace stack | Preserve screenplay sample fidelity |

Reading measure target for Book Mode (later): ~60–72 characters per line; generous line-height (~1.6–1.75).

## Information design patterns

| Pattern | Treatment |
|---|---|
| **Prose** | Serif or soft sans, uninterrupted column |
| **Sidebar / callout** | Marginal or inset panel; never interrupts sentence mid-flow without a clear break |
| **Secret Sauce** | Distinct callout label; quotable, short |
| **ELI5** | Softer panel; metaphor-first |
| **Formula** | Monospace fence or table; stable anchor IDs for Reference Mode |
| **Evidence** | Inline `[E1]`–`[E5]` chips + citation cluster |
| **Bad vs better** | Parallel columns or stacked labeled samples |
| **Exercise** | Action panel with clear prompt boundary |
| **Sample script** | Screenplay-faithful monospace block |

## Motion

Use restraint. Prefer:

- page/chapter enter fades
- callout reveal on scroll into view
- mode switch crossfade

Avoid decorative noise on reading surfaces.

## Component folders

| Folder | Owns |
|---|---|
| `components/layout` | Shell, nav, mode switcher |
| `components/reader` | Book page, progress, highlights chrome |
| `components/learning` | Lesson chrome, exercise UI |
| `components/atlas` | Graph / map widgets |
| `components/writing` | Beat board, editor, scene cards |
| `components/ui` | Shared primitives |

## Bootstrap UI

Home page only: product name **Writing** plus entry labels Read / Learn / Atlas / Write / Test. No fake dashboards or analytics.
