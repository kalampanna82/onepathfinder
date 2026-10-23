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
- Monthly Visa Bulletin: add the new month to `tools/priority-date-checker/bulletin.json` (keep the previous month; each bulletin has `effectiveFrom` = 12:01 AM Eastern on the 1st of its month, and the page switches by itself) to the data in `tools/visa-bulletin-movement/movement.js`, and append the month's Final Action Dates to `tools/visa-bulletin-pace/history.json` (6 EB rows and 5 family rows, 5 columns each). A scheduled task does this and opens a PR.

## Live tools
CSPA age calculator, N-400 eligibility, I-864 sponsor income, USCIS fee calculator, green card re-entry date, priority date checker, Visa Bulletin movement, SEVIS fee calculator, Visa Bulletin pace, OPT premium processing tracker.
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
- 2026-10-22: Added SEVIS I-901 fee calculator at /tools/sevis-fee-calculator/. Amounts are in `CATS` in `sevis.js` (F/M $350, J-1 $220, au pair/camp/summer work $35, G-programs and F-2/M-2/J-2 $0), last checked against ICE in Oct 2026. Re-check on ice.gov/sevis/i901 when ICE announces a change.
- 2026-10-22: USCIS fee calculator (/tools/uscis-fee-calculator/) now also lists fees by category (family, citizenship, work, asylum/parole/TPS) with search; about 30 forms. All fees live in `FORMS` in `fees.js` (one source; the page renders from it). Fees as of Oct 22, 2026 incl. the Oct 16, 2026 changes (annual asylum $105, first asylum/parole/TPS work permit $570, parole $1,050, TPS $520; `isNew: true`). Re-check against G-1055 when USCIS announces a change, and clear `isNew` badges after a few months.
- 2026-10-22: Added blog post "What is the SEVIS fee? Why do you have to pay it?" at /blog/what-is-the-sevis-fee/, linked from the SEVIS fee tool. Facts from ICE I-901 page and FAQ; re-check if ICE changes fee or rules.
- 2026-10-22: Added Visa Bulletin pace tool at /tools/visa-bulletin-pace/ (how a category's Final Action Date moved over time, with a chart and optional priority date). Data is `history.json`, Oct 2023 to Nov 2026 (38 months). 17 months were read twice from the official PDFs and agreed; Oct and Nov 2026 come from the PDFs you supplied; 7 months (Nov 2024, Jan 2025, Sep 2025, Dec 2025, Feb 2026, Apr 2026, Jun 2026) could not be fetched from travel.state.gov, so their employment rows come from prachub.com (`src: mirror`) and family rows are null. Backfill those from the official bulletins when possible. Past movement only: no forecast.
- 2026-10-22: Pace tool now shows a 3-year window: story (3 years ago, a year later, then, now), change over 1, 2 and 3 years with average per year, and a chart with year bands, direction colors and a "one year per year" reference line. Oct 2023 to Sep 2024 were added; Nov 2023 to Sep 2024 (except Feb 2024) were read twice from the official PDFs and agreed. Oct 2023 and Feb 2024 are `mirror` (prachub.com, employment rows only). Backfill from the official bulletins when possible.
- 2026-10-23: Added OPT premium processing day tracker at /tools/opt-premium-processing-tracker/. F-1 OPT/STEM OPT premium processing is 30 BUSINESS days (weekends and federal holidays excluded), counted from USCIS receipt of Form I-907; the tool shows business days, calendar days and the day-30 date. Holidays are computed by rule in `tracker.js` (no table to update). Wording comes from university international offices (UMD, Northwestern, Stony Brook) because USCIS's own pages would not load: verify against USCIS (business-day wording, RFE restart, refund, fee $1,780) and re-check when USCIS changes it.
- 2026-10-23: Added blog post "What is USCIS premium processing? Cost, timeline, rules and benefits" at /blog/what-is-premium-processing/. Facts from 8 CFR 106.4 (eCFR): fees $2,965 / $2,075 (I-539 to F, J, M) / $1,780 (H-2B, R-1, OPT I-765); 15, 30 or 45 BUSINESS days (a business day is a day the federal government is open); RFE/NOID restarts the full period; refund and keep processing if late. Links to the OPT tracker, so merge that PR first. Re-check fees and categories when USCIS adjusts them (every two years for inflation).
- Open: choose a path-based logo concept; then update the logo files and `brand/`.
- Open: multilingual rollout plan and URL structure (for example /es/).
