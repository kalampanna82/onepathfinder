# One Path Finder (onepathfinder.com)

One Path Finder LLC: immigration and tax document preparation. Sections: /immigration/, /tax/, Blog, Tools.
Hosted on Cloudflare Pages; every push to `main` deploys. Owner: kalampanna82.

## Stack and commands
Plain static HTML, one shared `styles.css`, one shared `script.js`, small per-tool JS files. No framework, no package.json, no build step.
- Run locally: `python3 -m http.server 8000`, then open http://localhost:8000
- "Build": none. Check by loading the page at phone width (about 400px) and desktop.
- `_headers` sets `no-cache` on css, js and /tools/*.

## Folder map
- `index.html`, `404.html`, `privacy.html`, `terms.html`: top-level pages
- `immigration/`, `tax/`: section landing pages (tool cards live here too)
- `blog/<slug>/index.html`, `blog/index.html`: articles and the article list
- `tools/<slug>/index.html` (+ own JS/data): one folder per tool; `tools/index.html` lists them
- `brand/`: logo kit (see `brand/README.md`); root `logo*.svg`, `favicon*`, `og-image.png` are copies of it
- `sitemap.xml`, `robots.txt`

## How to add things (details and snippets in README.md)
- Blog post: copy an existing post to `blog/<slug>/index.html`; set title, description, canonical; add a `.post` entry to `blog/index.html` and the URL to `sitemap.xml`.
- Tool: build `tools/<slug>/index.html` with the same header/footer and `class="page"`; add a `.tool` card to `tools/index.html` (and `immigration/index.html` if immigration); add to `sitemap.xml`. Keep a visible "not legal advice" note.
- Page: copy `tax/index.html`, update title, description, canonical, og tags; add nav link if needed and a sitemap entry.
- Monthly Visa Bulletin: add the new month to `tools/priority-date-checker/bulletin.json` (keep the previous month; each bulletin has `effectiveFrom` = 12:01 AM Eastern on the 1st of its month, and the page switches by itself) and to the data in `tools/visa-bulletin-movement/movement.js`. A scheduled task does this and opens a PR.

## Live tools
CSPA age calculator, N-400 eligibility, I-864 sponsor income, USCIS fee calculator, green card re-entry date, priority date checker, Visa Bulletin movement.
I-130 petition tool is ON HOLD until the owner has more research and lawyer guidance. Do not build or publish it.

## Brand
- Checkpoint logo (checkmark ending in a map pin) is live. Do NOT change the logo until the owner picks a path-based concept (fork, road, steps).
- Palette is moving to obsidian and gold (see `:root` in `styles.css`). Use the CSS variables, not new hard-coded colors.
- Green/red/blue are used only for status (forward / backward / no change).

## Planned
Multilingual versions: Spanish, Hindi, Urdu, Bangla, Arabic, Filipino/Tagalog (Arabic and Urdu need RTL). Not started.

## Rules
- Cite official sources (USCIS, travel.state.gov, IRS) with links. Keep immigration claims accurate.
- No legal advice and no guaranteed outcomes. Keep the disclaimer on tools and articles.
- No PII logging. Tools run in the browser; never send, store or log what people enter.
- Do not touch the owner's other domains or projects (PentoGIS, 1pathfinder.com, getready.*, musafir.travel). Never redirect them here.
- Match existing style and markup. No new dependencies without a stated reason.

## Workflow
- Pull requests only, never push to `main`. Keep each PR small and focused, with a description and test steps. The owner reviews and merges, unless he explicitly asks Claude to merge.
- The owner handles logins, DNS and Search Console. Do not attempt these.
- At the end of each session, update "Decisions and open items" below.

## Decisions and open items
- 2026-10-22: Added Visa Bulletin movement tool (Oct to Nov 2026) at /tools/visa-bulletin-movement/ (PR #13). It was briefly added to the PentoGIS repo by mistake and removed.
- 2026-10-22: Priority date checker now holds October and November bulletins and switches to November at 12:01 AM Eastern on Nov 1, 2026. Merge before then.
- Open: choose a path-based logo concept; then update the logo files and `brand/`.
- Open: multilingual rollout plan and URL structure (for example /es/).
