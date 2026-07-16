# Blog Post Table of Contents (Right-Side TOC) — Design Spec

**Date:** 2026-07-16
**Author:** Jonathan Liang (with Claude)
**Status:** Approved (pending user spec review)

## Goal

Add a right-side, quick-navigation Table of Contents (TOC) to blog post pages on the Lumina theme. The TOC is generated at runtime from the Markdown post's `H2` and `H3` headings, lets the reader jump to a section, and highlights the section currently in view.

## Non-Goals

- Adding TOC to non-post pages (blog list, About, Publications, Learning, project-detail pages).
- Build-time TOC generation via Liquid or jekyll-toc plugin.
- Showing H1, H4, H5, or H6 in the TOC.
- Mobile/tablet/narrow-desktop rendering. Below 1500px viewport width the TOC is not rendered at all.
- Altering the existing centered 720px article content width or 900px content-wrapper width.
- Touching the project-detail layout (`_layouts/project-detail.html`).

## Architecture

### Pieces

1. **`assets/js/blog-toc.js`** — single-file IIFE. Zero global exports. Responsibilities:
   - Locate `.lumina-post-content` (skip silently if not found — non-post pages).
   - Verify viewport ≥ 1500px (skip silently otherwise).
   - Collect `h2, h3` headings inside `.lumina-post-content`.
   - Bail if zero headings found (no TOC for that post).
   - Ensure each heading has an `id` (kramdown normally already generates one; only backfill missing ones).
   - Build TOC DOM into `<aside id="luminaToc">`.
   - Wire an `IntersectionObserver` to highlight the currently visible section.
   - Wire a click handler that performs a smooth scroll with 80px top offset (clears sticky/fixed chrome) and updates the URL hash via `history.replaceState`.
   - Re-run `init()` on `window.resize` (debounced 150ms) so TOC appears/disappears as the viewport crosses 1500px.

2. **`_sass/lumina.scss`** — append a `Blog TOC` section at the end of the file. Contains `.lumina-toc`, `.lumina-toc-title`, `.lumina-toc-list`, `.lumina-toc-item`, level modifiers, `.active` state, custom scrollbar, and the `@media (max-width: 1499px)` hide rule. No changes to `.lumina-main` — the TOC uses `position: fixed` (relative to viewport), so no positioning context is needed on the parent.

3. **`_layouts/post.html`** — in the Lumina branch only:
   - Add an empty `<aside class="lumina-toc" id="luminaToc" aria-label="Table of contents" hidden></aside>` as a sibling of `.lumina-post-content`.
   - Add `<script src="/assets/js/blog-toc.js" defer></script>` near the bottom of the Lumina branch (after the existing mermaid block).

### Why These Pieces

- **JS at runtime** (vs build-time): one implementation serves every existing and future post automatically, with no per-post front-matter flag or plugin dependency. Cost: a brief flash with no TOC before `DOMContentLoaded` + script `defer` fires; acceptable since the TOC is non-critical navigation.
- **Independent `.js` file** (vs inlined into `post.html`): keeps `post.html` (already large due to the mermaid block) focused on layout. Browser caches the static JS across post navigations.
- **SCSS appended to `lumina.scss`** (vs new partial): Lumina is currently a single SCSS file without a `_sass/lumina/` subdirectory. Adding a section matches the existing organization (the file already has clearly-commented sections for layout, sidebar, cards, blog, responsive).
- **Fixed positioning inside viewport**: TOC uses `position: fixed` so it is out of normal document flow and stays pinned to the viewport's top-right as the user scrolls. The centered 720px article width and 900px content-wrapper are untouched. `position: fixed` (relative to the viewport) is used instead of `absolute` (relative to `.lumina-main`) because an `absolute` element scrolls with its containing block — it would scroll away with the article. `sticky` would also work but requires the TOC to be a flex sibling of the centered content-wrapper, which would force restructuring the existing layout. `fixed` is the least-invasive choice.

### Data Flow

```
Page HTML loaded
  ↓
post.html renders an empty <aside id="luminaToc" hidden>
  ↓
defer'd blog-toc.js executes at DOMContentLoaded
  ↓
init():
  1. querySelector('.lumina-post-content') → null? return (non-post page)
  2. matchMedia('(min-width: 1500px)') → false? return (narrow viewport)
  3. collect h2, h3 inside content → empty? return (no TOC for this post)
  4. ensureIds() — backfill id on any heading missing one
  5. buildToc() — inject <div class="lumina-toc-title"> + <nav class="lumina-toc-list"> with <a> per heading into #luminaToc; remove [hidden]
  6. setupActiveTracking() — IntersectionObserver on each heading; toggles .active on the corresponding TOC link
  7. setupClickHandler() — clicks on TOC links call scrollTo(target.top - 80, smooth) + replaceState hash
  ↓
window.resize (debounced 150ms):
  - if crossed 1500px boundary: re-init (clear + rebuild, or hide)
```

## DOM Structure

Rendered TOC (positioned fixed relative to viewport; lives in `.lumina-main`'s DOM tree as a sibling of `.lumina-content-wrapper`, but visually anchored to the top-right of the viewport):

```html
<aside class="lumina-toc" id="luminaToc" aria-label="Table of contents">
  <div class="lumina-toc-title">On this page</div>
  <nav class="lumina-toc-list">
    <a class="lumina-toc-item lumina-toc-item--level-2" href="#section-1" data-toc-target="section-1">Section 1</a>
    <a class="lumina-toc-item lumina-toc-item--level-3" href="#section-1-1" data-toc-target="section-1-1">Section 1.1</a>
    <a class="lumina-toc-item lumina-toc-item--level-2" href="#section-2" data-toc-target="section-2">Section 2</a>
  </nav>
</aside>
```

The empty placeholder rendered by `post.html` (before JS runs):

```html
<aside class="lumina-toc" id="luminaToc" aria-label="Table of contents" hidden></aside>
```

## Layout & Positioning

- **`.lumina-main`**: no changes. The TOC uses `position: fixed`, which is relative to the viewport, so no positioning context on `.lumina-main` is required.

- **`.lumina-toc`**:
  - `position: fixed`
  - `right: 1.5rem` — hugs the viewport's right edge
  - `top: 1.5rem` — clears the top of the viewport
  - `width: 240px`
  - `max-height: calc(100vh - 3rem)` — bounds the TOC so a long outline scrolls inside the TOC rather than overflowing the viewport
  - `overflow-y: auto` with a thin 4px custom scrollbar matching Lumina's sidebar styling
  - `z-index: 900` — below the mobile sidebar drawer (1050) and overlay (1000) so the TOC never sits on top of mobile chrome even if a media query regresses

- **Behavior on scroll**: Because `position: fixed` anchors the element to the viewport (not to any scrolling ancestor), the TOC stays pinned to the top-right while the article scrolls past. No `position: sticky` is used. `position: absolute` was rejected because an absolute element scrolls with its containing block — it would scroll away with the article.

- **Right-edge gutter math** (justification for the 1500px breakpoint): the article text column is 720px wide, centered inside a 900px content-wrapper, which is centered inside `.lumina-main` (width = viewport − 256px for the fixed sidebar). The rightmost edge of the article text column sits at distance `((viewport − 256 − 900) / 2) + 90 = (viewport − 1156) / 2 + 90` from the viewport's right edge. The TOC needs `240px width + 24px right offset = 264px`. Solving `(viewport − 1156) / 2 + 90 ≥ 264` gives `viewport ≥ 1494px`; rounding up to the nearest 100 gives 1500px. Below 1500px, the 240px TOC would overlap the article text.

- **Long TOC**: When an article has many headings, the TOC's `max-height: calc(100vh - 3rem)` plus `overflow-y: auto` makes the TOC scroll internally, independent of the page scroll. The page scroll position is never affected.

- **Empty TOC**: When a post has no `h2` or `h3`, JS leaves `#luminaToc` with `hidden` attribute. The `[hidden]` attribute plus `&[hidden] { display: none; }` SCSS rule ensures no empty box is visible.

## Responsive Behavior

| Viewport width | Behavior |
|---|---|
| ≤ 1499px | TOC not rendered. CSS `display: none` on `.lumina-toc` AND JS `shouldRender()` returns false (no DOM built). Existing Lumina `@media (max-width: 768px)` post-content font-size rules are entirely unaffected. |
| ≥ 1500px | TOC rendered at `width: 240px`, fixed to viewport top-right. |

**Why 1500px and not 768px**: At 768px the Lumina sidebar collapses to a mobile drawer (so `.lumina-main` becomes full-width). Between 768–1499px the centered 900px article leaves an insufficient right gutter to fit a 240px TOC + 24px offset without overlapping the article text column (see gutter math above). 1500px is the smallest width at which the TOC has breathing room without overlap. Above 1500px there is only one TOC size (240px); no need for a "narrow desktop" tier.

**Mobile zoom**: Because the TOC is not rendered at all below 1500px (no DOM, no CSS layout), there is nothing for mobile browsers to scale or reflow. The existing mobile breakpoints for `.lumina-post-content` (`font-size: 1rem`, padding adjustments) continue to apply identically.

## JS Module Interface

`assets/js/blog-toc.js` exposes nothing to `window`. It runs once on `DOMContentLoaded` (or immediately if `document.readyState !== 'loading'`), and re-runs `init()` on debounced resize.

Configuration constants at the top of the IIFE:

| Constant | Value | Purpose |
|---|---|---|
| `SELECTORS.content` | `'.lumina-post-content'` | Where to find headings |
| `SELECTORS.toc` | `'#luminaToc'` | Where to render the TOC |
| `BREAKPOINT` | `1500` | Below this, do not render |
| `SCROLL_OFFSET` | `80` | px to subtract from target's `getBoundingClientRect().top + scrollY` so the heading isn't hidden under any fixed/sticky chrome |
| `RESIZE_DEBOUNCE_MS` | `150` | Debounce window for resize-driven re-init |

## Error Handling

- **No `.lumina-post-content` on page** (e.g., blog list, About page): `init()` returns at the first guard. Zero side effects.
- **No `#luminaToc` element** (shouldn't happen on post pages, but defensively): `buildToc()` returns silently.
- **Heading without `id`**: backfilled with `toc-heading-<index>`. Kramdown already generates ids, so this is a safety net only.
- **`IntersectionObserver` unsupported** (very old browsers): feature-detect; if absent, skip active-tracking setup. TOC still renders and click-jump still works.
- **Smooth scroll unsupported**: `behavior: 'smooth'` falls back to instant scroll in unsupported browsers (browser-native graceful degradation).

## Testing

Manual test matrix (no automated tests — pure static-site JS with no build step):

1. **Desktop ≥1500px**: open a post with multiple H2/H3 headings → TOC visible at right edge, 240px wide, scrolls internally if long, highlights current section while scrolling, click jumps with 80px top offset.
2. **Desktop 768–1499px**: same post → TOC not visible, no empty box, article layout unchanged.
3. **Desktop <768px (and mobile)**: same post → TOC not visible, sidebar drawer behavior unchanged, post-content font-size and padding follow existing `@media (max-width: 768px)` rules.
4. **Post without H2/H3**: TOC not visible, no empty box, no console errors.
5. **Non-post page** (Blog list, About): no `#luminaToc` in DOM, no JS errors in console.
6. **Resize across 1500px boundary**: TOC appears/disappears without page reload; no duplicate observers.
7. **Anchor link click**: URL hash updates; browser back/forward still works.
8. **Post with mermaid diagrams**: TOC still built correctly (mermaid replaces `<code>` blocks, doesn't add H2/H3).

## File-Level Summary of Changes

| File | Change |
|---|---|
| `assets/js/blog-toc.js` | NEW. ~100 lines. IIFE TOC builder + IntersectionObserver + click handler + resize re-init. |
| `_sass/lumina.scss` | MODIFIED. Append `Blog TOC` section at end (~60 lines). No changes to `.lumina-main`. |
| `_layouts/post.html` | MODIFIED. Lumina branch only: add empty `<aside id="luminaToc" hidden>` + `<script defer>` for blog-toc.js. |

No other files touched. No `_config.yml` changes. No new Jekyll plugin. No Gemfile changes. No new SCSS partial files.
