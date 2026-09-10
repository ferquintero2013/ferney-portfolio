# Ferney Quintero — Automation Studio

Personal portfolio. Vanilla HTML, CSS and JavaScript — no framework, no build step,
no dependencies. Three files ship to production.

## Running it

Any static server works:

```bash
npx serve .          # or: python -m http.server 4321
```

Then open `http://localhost:4321`. Deployment is Vercel (`.vercel/` holds the project link).

## Architecture

```
index.html      Markup shell — sections, drawer, palette. No project copy lives here.
styles.css      Design system in CSS custom properties, light + dark themes.
script.js       One IIFE, split into labelled modules. All content lives in the
                PROJECTS / SKILLS / TICKER constants at the top.
assets/         Legacy SVG previews — no longer referenced (diagrams are inline now).
```

**Editing content:** everything user-facing except the About copy is data. Open
`script.js` and edit the `PROJECTS` array — cards, the case-study drawer, the command
palette entries and the terminal's `projects` / `open` commands all read from it, so a
single edit updates the whole site.

## Interaction map

| Feature | Where | Notes |
| --- | --- | --- |
| Hero automation graph | `heroGraph()` | Canvas DAG. Nodes are spring-loaded and repel the cursor; drag them, or click one to fire data packets down its edges. Ambient traffic runs on an interval. |
| Command palette | `palette()` | `⌘K` / `Ctrl+K`, or `/` when nothing is focused. Fuzzy-ish filter over sections, case studies and actions. |
| Terminal | `terminal()` | Real command parser with history (↑/↓), tab completion, and commands that drive the page: `open <id>` opens a case study, `theme` flips the theme, `burst` fires the hero graph. |
| Case-study drawer | `openCase()` | Slide-in panel with a per-project inline SVG schematic drawn in the site palette. Deep-linkable via `#project-id`. |
| Filters | `applyFilter()` | Tag list is derived from the project data, not hard-coded. |
| Theme | `setTheme()` | Follows `prefers-color-scheme` on first visit, then persists to `localStorage`. Dark mode inverts the Work/footer bands rather than just darkening them. |
| Custom cursor | top of file | Ring follows with easing and reads `data-cursor` from the hovered element. Disabled on touch and under `prefers-reduced-motion`. |
| Easter egg | bottom of file | Konami code → turbo mode on the hero graph. |

Every animation is behind a `prefers-reduced-motion` check, and pointer interaction on
the hero canvas is desktop-only so it never fights touch scrolling.

## Design system

Tokens live in `:root`, with a `[data-theme="dark"]` block that redefines the same
names — no color is defined only inside a media query.

| Token | Light | Role |
| --- | --- | --- |
| `--paper` | `#f4f0e8` | Page ground |
| `--ink` | `#171717` | Text, inverted bands |
| `--coral` | `#ed684a` | Single accent — links, packets, highlights |
| `--blue` | `#315d73` | Secondary accent, card hover |

Type: **Space Grotesk** for display, **DM Mono** for every label, tag and metadata line.
Layout is grid-based with hairline rules — editorial rather than card-and-shadow.

## Projects featured

1. **Amapola Board** — Kanban ticket manager, vanilla JS + Supabase realtime. Private demo on request.
2. **Amapola MCP Server** — MCP endpoint letting an AI agent read/write the board. Next.js 15, OAuth 2.1 + PKCE. → https://amapola-mcp.vercel.app/api/mcp
3. **AI Lambda Instagram Bot** — n8n + gpt-4.1-mini + ManyChat lead qualification with CRM handoff.
4. **GHL Attribution Engine** — UTM capture and AI-assisted attribution for GoHighLevel.

## Contact

WhatsApp +57 321 398 6410 · [GitHub](https://github.com/ferquintero2013) · [LinkedIn](https://www.linkedin.com/in/ferney-quintero-7301b547/)

## License

ISC.
