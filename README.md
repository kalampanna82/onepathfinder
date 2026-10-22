Basic One Path Finder website.

Static site on Cloudflare Pages. Every push to `main` deploys.

## Adding a blog article

1. Copy an existing page (for example `privacy.html`) to `blog/<slug>/index.html`, so the URL is `/blog/<slug>/`.
2. Use this layout inside `<main id="main" class="page article">`:

```html
<a class="back" href="/blog/">&larr; All articles</a>
<h1>Article title</h1>
<p class="meta">Published October 22, 2026</p>
<p>Opening paragraph.</p>
<div class="callout"><p>General information only, not legal advice. See our <a href="/terms">Terms &amp; Disclaimer</a>.</p></div>
<div class="sources">
  <h2>Official sources</h2>
  <ul><li><a href="https://www.uscis.gov/..." rel="noopener">USCIS page title</a></li></ul>
</div>
```

3. Set the page `<title>`, `<meta name="description">` and `<link rel="canonical" href="https://onepathfinder.com/blog/<slug>/">`.
4. Add an entry to `blog/index.html` inside `<div class="post-list">`:

```html
<article class="post">
  <p class="meta">October 22, 2026</p>
  <h2><a href="/blog/<slug>/">Article title</a></h2>
  <p>One-sentence summary.</p>
</article>
```

5. Add the article URL to `sitemap.xml`. When the first article is published, also remove the `noindex` line from `blog/index.html`, delete the "coming soon" paragraph, and add `/blog/` to the sitemap.

## Adding a tool

1. Build the tool at `tools/<slug>/index.html` (same header, footer and `class="page"` layout as the other pages). Keep a visible note that results are estimates and not legal advice.
2. Add an entry to `tools/index.html` inside `<div class="tool-list">`:

```html
<div class="tool">
  <h2><a href="/tools/<slug>/">Tool name</a></h2>
  <p>One sentence on what it does.</p>
  <a class="go" href="/tools/<slug>/">Open tool</a>
</div>
```

3. Add the tool URL to `sitemap.xml`. When the first tool is published, also remove the `noindex` line from `tools/index.html`, delete the "coming soon" paragraph, and add `/tools/` to the sitemap.

## Content rules

Keep immigration claims accurate, cite official sources such as USCIS, and do not give legal advice or guarantee outcomes.
