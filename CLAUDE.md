# One Path Finder (onepathfinder.com)

One Path Finder LLC: immigration and tax document preparation. Sections: /immigration/, /tax/, Blog, Tools.
Hosted on Cloudflare Pages (project `onepathfinder`); every push to `main` deploys. Owner: kalampanna82. GitHub repo: `kalampanna82/onepathfinder.com` (renamed from `onepathfinder`; the old URL redirects, never create a new repo with the old name).

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
- Monthly Visa Bulletin: add the new month to `tools/priority-date-checker/bulletin.json` (keep the previous month; each bulletin has `effectiveFrom` = 12:01 AM Eastern on the 1st of its month, and the page switches by itself) to the data in `tools/visa-bulletin-movement/movement.js`, and append the month's Final Action Dates to `tools/visa-bulletin-pace/history.json` (6 EB rows and 5 family rows, 5 columns each). A scheduled task ("Visa Bulletin monthly update (onepathfinder.com)", 21st, 23rd, 25th and 27th of each month at 8:40 AM Eastern; only the first run after the bulletin is out does the work; created 2026-10-24 on the owner's main Claude account) does this and opens a PR for the owner; it never merges, and stops without a PR if it cannot read the official bulletin.

## Live tools
CSPA age calculator, N-400 eligibility, I-864 sponsor income, USCIS fee calculator, green card re-entry date, priority date checker, Visa Bulletin movement, SEVIS fee calculator, Visa Bulletin pace, OPT premium processing tracker, Is premium processing worth it?, OPT date planner, Substantial presence test calculator, Filing status finder, NJ resident or nonresident tracker.
I-130 petition tool is ON HOLD until the owner has more research and lawyer guidance. Do not build or publish it.

## Brand
- Checkpoint logo (checkmark ending in a map pin) is live. Do NOT change the logo until the owner picks a path-based concept (fork, road, steps).
- Palette is moving to obsidian and gold (see `:root` in `styles.css`). Use the CSS variables, not new hard-coded colors.
- Green/red/blue are used only for status (forward / backward / no change).

## Planned
Multilingual versions, first wave of 5: Spanish, Bangla, Hindi, Urdu, Arabic (Arabic and Urdu need RTL). Separate URL per language (/es/, /bn/, /hi/, /ur/, /ar/), each reviewed by a native speaker before launch. Possible second wave: Filipino/Tagalog, Chinese, Portuguese, Haitian Creole, Korean. Not started.

Owner's claude.ai prototypes (Oct 2026) for tool ideas. Use them for the logic, but rebuild in site style: shared header/footer, `styles.css` variables (they use an old blue palette) and the `site-notice`. Re-check every number against official sources before publishing.
- Filing Status Finder (tax): a question tree that suggests Single / HoH / MFJ / MFS / QSS (based on IRS Pub 501), with 2025 standard deductions ($15,750 / $23,625 / $31,500). Built 2026-10-23 at /tools/filing-status-finder/.
- NJ Resident or Nonresident Tracker (tax): the domicile rule (NJ domicile but a permanent home only outside NJ and 30 days or less in NJ means nonresident; a permanent home in NJ plus more than 183 days means statutory resident); a move during the year means part-year (NJ-1040 plus NJ-1040NR). Also checks whether filing is required ($10,000 single/MFS, $20,000 MFJ/HoH/QSS). Built 2026-10-23 at /tools/nj-residency-tracker/. The statutory-resident test is "kept a permanent home in NJ" (the prototype's "all year" was dropped; the rule does not say it).
- The N-400 and I-864 prototypes match tools that are already live. The I-864 2026 poverty guidelines match `i864.js`.
- I-130 Petition Assistant: a step-by-step questionnaire that fills the official I-130 PDF with pdf-lib. ON HOLD (see Live tools).
- Every prototype has a "Request a Consultation" lead form (name, email, phone) that saves to the artifact database. Do NOT copy it to the site: it breaks the no-PII rule. Lead capture on the site needs the owner's decision first (where submissions go, privacy policy update).

## Rules
- Cite official sources (USCIS, travel.state.gov, IRS) with links. Keep immigration claims accurate.
- No legal advice and no guaranteed outcomes. Keep the disclaimer on tools and articles.
- No PII logging. Tools run in the browser; never send, store or log what people enter.
- Do not touch the owner's other domains or projects (PentoGIS, 1pathfinder.com, getready.*, musafir.travel). Never redirect them here.
- Match existing style and markup. No new dependencies without a stated reason.

## Workflow
- When delivering work, always give the owner the PR link and the live page link.
- Pull requests only, never push to `main`. Keep each PR small and focused, with a description and test steps. The owner reviews and merges, unless he explicitly asks Claude to merge.
- The owner handles logins, DNS and Search Console. Do not attempt these.
- At the end of each session, update "Decisions and open items" below.

## Decisions and open items
- 2026-10-22: Added Visa Bulletin movement tool (Oct to Nov 2026) at /tools/visa-bulletin-movement/ (PR #13). It was briefly added to the PentoGIS repo by mistake and removed.
- 2026-10-22: Priority date checker now holds October and November bulletins and switches to November at 12:01 AM Eastern on Nov 1, 2026. Merge before then. While the next bulletin is published but not yet in effect, the checker also shows what it means for the user's date and when it starts.
- 2026-10-22: Added SEVIS I-901 fee calculator at /tools/sevis-fee-calculator/. Amounts are in `CATS` in `sevis.js` (F/M $350, J-1 $220, au pair/camp/summer work $35, G-programs and F-2/M-2/J-2 $0), last checked against ICE in Oct 2026. Re-check on ice.gov/sevis/i901 when ICE announces a change.
- 2026-10-22: USCIS fee calculator (/tools/uscis-fee-calculator/) now also lists fees by category (family, citizenship, work, asylum/parole/TPS) with search; about 30 forms. All fees live in `FORMS` in `fees.js` (one source; the page renders from it). Fees as of Oct 22, 2026 incl. the Oct 16, 2026 changes (annual asylum $105, first asylum/parole/TPS work permit $570, parole $1,050, TPS $520; `isNew: true`). Re-check against G-1055 when USCIS announces a change, and clear `isNew` badges after a few months.
- 2026-10-22: Added blog post "What is the SEVIS fee? Why do you have to pay it?" at /blog/what-is-the-sevis-fee/, linked from the SEVIS fee tool. Facts from ICE I-901 page and FAQ; re-check if ICE changes fee or rules.
- 2026-10-22: Added Visa Bulletin pace tool at /tools/visa-bulletin-pace/ (how a category's Final Action Date moved over time, with a chart and optional priority date). Data is `history.json`, Oct 2023 to Nov 2026 (38 months). 17 months were read twice from the official PDFs and agreed; Oct and Nov 2026 come from the PDFs you supplied; 7 months (Nov 2024, Jan 2025, Sep 2025, Dec 2025, Feb 2026, Apr 2026, Jun 2026) could not be fetched from travel.state.gov, so their employment rows come from prachub.com (`src: mirror`) and family rows are null. Backfill those from the official bulletins when possible. Past movement only: no forecast.
- 2026-10-22: Pace tool now shows a 3-year window: story (3 years ago, a year later, then, now), change over 1, 2 and 3 years with average per year, and a chart with year bands, direction colors and a "one year per year" reference line. Oct 2023 to Sep 2024 were added; Nov 2023 to Sep 2024 (except Feb 2024) were read twice from the official PDFs and agreed. Oct 2023 and Feb 2024 are `mirror` (prachub.com, employment rows only). Backfill from the official bulletins when possible.
- 2026-10-23: Added OPT premium processing day tracker at /tools/opt-premium-processing-tracker/. F-1 OPT/STEM OPT premium processing is 30 BUSINESS days (weekends and federal holidays excluded), counted from USCIS receipt of Form I-907; the tool shows business days, calendar days and the day-30 date. Holidays are computed by rule in `tracker.js` (no table to update). Rules from 8 CFR 106.4 (eCFR): 30 business days (a day the federal government is open; closures also excluded), clock starts when USCIS has all prerequisites plus the I-907 and fee, an RFE/NOID restarts a full new period, refund if late. Fee $1,780. Re-check when USCIS changes it.
- 2026-10-23: Added blog post "What is USCIS premium processing? Cost, timeline, rules and benefits" at /blog/what-is-premium-processing/. Facts from 8 CFR 106.4 (eCFR): fees $2,965 / $2,075 (I-539 to F, J, M) / $1,780 (H-2B, R-1, OPT I-765); 15, 30 or 45 BUSINESS days (a business day is a day the federal government is open); RFE/NOID restarts the full period; refund and keep processing if late. Links to the OPT tracker, so merge that PR first. Re-check fees and categories when USCIS adjusts them (every two years for inflation).
- 2026-10-23: Added "Is premium processing worth it?" at /tools/premium-processing-worth-it/ (compares premium vs regular: cost, weeks saved, cost per week, and whether each meets the user's needed-by date). Categories, fees and business days are in `CATS` in `worth.js` (8 CFR 106.4; fees G-1055 Oct 2026). The user types the regular processing time from USCIS because it changes monthly; nothing is hard-coded. Reuses `tracker.js` from the OPT tracker for business days. Re-check `CATS` when USCIS changes fees or timeframes.
- 2026-10-23: "Is premium processing worth it?" now takes one regular-processing number (USCIS shows "80% of cases are completed within N months", not a range) and prefills it from `tools/premium-processing-worth-it/processing.json` (keys = category ids in `worth.js`; each entry has months, office, asOf). Only F-1 OPT (I-765 (c)(3), SCOPS, 5 months, 2026-10-23) is filled so far; other categories ask the visitor to type it. USCIS's processing times site cannot be read from the Claude sandbox, so updating the file is manual unless the scheduled task manages it.
- 2026-10-23: Added OPT and STEM OPT date planner at /tools/opt-date-planner/. Rules from the USCIS Policy Manual Vol. 2 Part F Ch. 5 and 8 CFR 214.2(f): apply from 90 days before to 60 days after program end (USCIS must receive within 30 days of the DSO recommendation); start up to 60 days after program end; 12 months; 60-day grace period after the work permit ends; 90 unemployment days on OPT, 150 with STEM; STEM filing from 90 days before the OPT end and before it ends; 24 months; up to 180 days automatic extension if filed in time. Cap-gap is not calculated (only a note). Re-check when USCIS changes the OPT rules.
- 2026-10-23: Added a site-wide "Site under development" notice (the `site-notice` block after the skip link on every page, style at the end of `styles.css`): information and tool logic are still being verified, do not rely on it yet. New pages must copy it. To remove it later, delete the `site-notice` comment and div from every page and the two CSS rules.
- 2026-10-23: Added Substantial presence test calculator at /tools/substantial-presence-test/ (linked from /tax/). Rules from IRS pages (Substantial presence test, reviewed 14 Mar 2026; Teachers and trainees, 16 Apr 2026) and Form 8843 instructions (2025): 31 days this year and current + 1/3 prior + 1/6 year-before >= 183 (compared in integers, 6*c+2*p1+p2 >= 1098); students exempt up to 5 calendar years (more: only if no intent to reside permanently, shown as 'it depends'); teachers/trainees not exempt if exempt in 2 of the 6 prior years, unless 3 or fewer and a foreign employer paid all pay. Covers the substantial presence test only (not the green card test or dual-status years). Prior-year exempt days are entered by the visitor. Re-check when the IRS updates these pages or the form.
- Open: choose a path-based logo concept; then update the logo files and `brand/`.
- 2026-10-23: Owner decided multilingual starts with 5 languages (Spanish, Bangla, Hindi, Urdu, Arabic) on separate URLs per language, with native-speaker review. Filipino/Tagalog moved to a possible second wave.
- 2026-10-23: Recorded the owner's claude.ai prototypes (Filing Status Finder, NJ residency tracker, N-400, I-864, I-130) under Planned. Next tax tool candidates: Filing Status Finder and NJ residency tracker.
- 2026-10-23: Added Filing status finder at /tools/filing-status-finder/ (linked from /tax/). Question tree in `NODES`/`RESULTS` in `fsf.js` (IRS Pub 501 and Pub 519). Adds a first question for nonresident aliens (1040-NR: no MFJ/HoH, generally no standard deduction) and dual-status years, and a married branch for a nonresident-alien spouse (MFS, or elect to file jointly). Standard deductions in `DEDUCTIONS`: 2025 $15,750 / $31,500 / $23,625 (OBBBA), 2026 $16,100 / $32,200 / $24,150 (Rev. Proc. 2025-32). Add the next year when the IRS announces it (usually October).
- 2026-10-23: Added NJ resident or nonresident tracker at /tools/nj-residency-tracker/ (linked from /tax/). Rules from NJ GIT-6 and the NJ-1040/1040NR instructions; thresholds in `THRESHOLDS` in `nj.js` ($10,000 / $20,000, gross income from everywhere for the whole year; nonresidents file only with NJ-source income). irs.gov and nj.gov cannot be fetched from the Claude sandbox; facts were checked through web search of those sites. Re-check thresholds against the current NJ-1040 instructions each year.
- Open: lead capture / consultation requests (prototypes have one; site has none). Needs owner decision on where submissions go and a privacy policy update.
- Open: multilingual rollout plan (which pages to translate first, shared `styles.css` RTL rules, hreflang tags, sitemap entries). Nothing built yet.
- 2026-10-24: Repo renamed to `kalampanna82/onepathfinder.com` to match the domain (also `pentogis.com`; the getready repos already used domain names). Added `CLAUDE.md` to the other 4 repos. Confirmed all 5 sites deploy through Cloudflare Pages; getready.academy's duplicate GitHub Pages site was unpublished.
- Open (tool ideas, in order, from the 2026-10-23 session): H-1B 60-day grace period calculator, EAD renewal planner, document checklist generator, naturalization civics practice, unlawful presence estimator, premium processing eligibility checker.
- Open (manual upkeep): update `tools/premium-processing-worth-it/processing.json` monthly (USCIS site cannot be read from the sandbox); backfill `src: mirror` months in `history.json`; spot-check fee amounts against G-1055.
- Open (unverified, check before removing the `site-notice`): OPT start on the program end date itself; exact unemployment-day counting (ask a DSO); premium-processing non-eligible forms (I-485, N-400, I-130).
- 2026-10-24: Rescued two commits pushed after their PRs merged: priority checker next-bulletin box (PR #35) and the worth-it Compare button (PR #36). Old branches are fully merged and can be deleted.
- 2026-10-24: Re-enabled the Visa Bulletin scheduled task (it was paused) and corrected its schedule above to the 21st/23rd/25th/27th. Known issue: travel.state.gov answers 403 to Claude cloud sessions (page and PDF), so the task will likely stop with "not published yet" and post "ACTION NEEDED" on the 27th; add the bulletin by hand when that happens. Owner chose to keep the task unchanged (no mirrors).
