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
- Mobile/tablet rendering. Below 1100px viewport width the TOC is not rendered at all.
- Altering the existing centered 720px article content width or 900px content-wrapper width.
- Touching the project-detail layout (`_layouts/project-detail.html`).

## Architecture

### Pieces

1. **`assets/js/blog-toc.js`** — single-file IIFE. Zero global exports. Responsibilities:
   - Locate `.lumina-post-content` (skip silently if not found — non-post pages).
   - Verify viewport > 1100px (skip silently otherwise).
   - Collect `h2, h3` headings inside `.lumina-post-content`.
   - Bail if zero headings found (no TOC for that post).
   - Ensure each heading has an `id` (kramdown normally already generates one; only backfill missing ones).
   - Build TOC DOM into `<aside id="luminaToc">`.
   - Wire an `IntersectionObserver` to highlight the currently visible section.
   - Wire a click handler that performs a smooth scroll with 80px top offset (clears sticky/fixed chrome) and updates the URL hash via `history.replaceState`.
   - Re-run `init()` on `window.resize` (debounced 150ms) so TOC appears/disappears as the viewport crosses 1100px.

2. **`_sass/lumina.scss`** — append a `Blog TOC` section at the end of the file. Contains `.lumina-toc`, `.lumina-toc-title`, `.lumina-toc-list`, `.lumina-toc-item`, level modifiers, `.active` state, custom scrollbar, and the `@media (max-width: 1100px)` hide rule. Also bumps `.lumina-main` to `position: relative` so the absolute-positioned TOC anchors against `.lumina-main`'s right edge.

3. **`_layouts/post.html`** — in the Lumina branch only:
   - Add an empty `<aside class="lumina-toc" id="luminaToc" aria-label="Table of contents" hidden></aside>` as a sibling of `.lumina-post-content`.
   - Add `<script src="/assets/js/blog-toc.js" defer></script>` near the bottom of the Lumina branch (after the existing mermaid block).

### Why These Pieces

- **JS at runtime** (vs build-time): one implementation serves every existing and future post automatically, with no per-post front-matter flag or plugin dependency. Cost: a brief flash with no TOC before `DOMContentLoaded` + script `defer` fires; acceptable since the TOC is non-critical navigation.
- **Independent `.js` file** (vs inlined into `post.html`): keeps `post.html` (already large due to the mermaid block) focused on layout. Browser caches the static JS across post navigations.
- **SCSS appended to `lumina.scss`** (vs new partial): Lumina is currently a single SCSS file without a `_sass/lumina/` subdirectory. Adding a section matches the existing organization (the file already has clearly-commented sections for layout, sidebar, cards, blog, responsive).
- **Absolute positioning inside `.lumina-main`**: TOC is out of document flow, so the centered 720px article width and 900px content-wrapper are untouched. `.lumina-main` is the page's scrolling container (whole-page scroll via `body`), so an absolutely-positioned element inside it visually behaves like `fixed` — it stays in the viewport as the user scrolls, while the article scrolls past. This achieves the "sticky-feeling" behavior without `position: sticky` (which is incompatible with `position: absolute` on the same element).

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
  2. matchMedia('(min-width: 1101px)') → false? return (small screen)
  3. collect h2, h3 inside content → empty? return (no TOC for this post)
  4. ensureIds() — backfill id on any heading missing one
  5. buildToc() — inject <div class="lumina-toc-title"> + <nav class="lumina-toc-list"> with <a> per heading into #luminaToc; remove [hidden]
  6. setupActiveTracking() — IntersectionObserver on each heading; toggles .active on the corresponding TOC link
  7. setupClickHandler() — clicks on TOC links call scrollTo(target.top - 80, smooth) + replaceState hash
  ↓
window.resize (debounced 150ms):
  - if crossed 1100px boundary: re-init (clear + rebuild, or hide)
```

## DOM Structure

Rendered TOC (inside `.lumina-main`, sibling of `.lumina-content-wrapper`):

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

- **`.lumina-main`** gains `position: relative` (currently `static`). This is the only structural change to existing CSS. It does not affect any existing child layouts (`.lumina-content-wrapper`, footer, etc.) because none of them rely on `.lumina-main` being a positioning context.

- **`.lumina-toc`**:
  - `position: absolute`
  - `right: 1.5rem` — hugs `.lumina-main`'s right edge
  - `top: 3rem` — clears the top padding
  - `width: 240px` (default); `width: 200px` in the 1101–1400px range to avoid encroaching on the centered 900px article at narrow desktop widths
  - `max-height: calc(100vh - 4.5rem)` — bounds the TOC so a long outline scrolls inside the TOC rather than overflowing the viewport
  - `overflow-y: auto` with a thin 4px custom scrollbar matching Lumina's sidebar styling

- **Behavior on scroll**: Because `.lumina-main` is the scrolling context (whole-page scroll) and the TOC is absolutely positioned inside it with `top: 3rem`, the TOC appears visually pinned to the viewport's top-right as the user scrolls. No `position: sticky` is used (sticky + absolute are mutually exclusive on the same element, and pure sticky would require restructuring the centered content-wrapper, which is explicitly out of scope).

- **Long TOC**: When an article has many headings, the TOC's `max-height: calc(100vh - 4.5rem)` plus `overflow-y: auto` makes the TOC scroll internally, independent of the page scroll. The page scroll position is never affected.

- **Empty TOC**: When a post has no `h2` or `h3`, JS leaves `#luminaToc` with `hidden` attribute. The `[hidden]` attribute plus `&[hidden] { display: none; }` SCSS rule ensures no empty box is visible.

## Responsive Behavior

| Viewport width | Behavior |
|---|---|
| ≤ 1100px | TOC not rendered. CSS `display: none` on `.lumina-toc` AND JS `shouldRender()` returns false (no DOM built). Existing Lumina `@media (max-width: 768px)` post-content font-size rules are entirely unaffected. |
| 1101–1400px | TOC rendered at `width: 200px`. |
| > 1400px | TOC rendered at `width: 240px`. |

**Why 1100px and not 768px**: At 768px the Lumina sidebar already collapses to a mobile drawer (so `.lumina-main` becomes full-width), but between 768–1100px the centered 900px article leaves almost no gutter on either side. A 200–240px TOC in that range would overlap the article. 1100px is the smallest width at which the TOC has breathing room without overlapping content.

**Mobile zoom**: Because the TOC is not rendered at all below 1100px (no DOM, no CSS layout), there is nothing for mobile browsers to scale or reflow. The existing mobile breakpoints for `.lumina-post-content` (`font-size: 1rem`, padding adjustments) continue to apply identically.

## JS Module Interface

`assets/js/blog-toc.js` exposes nothing to `window`. It runs once on `DOMContentLoaded` (or immediately if `document.readyState !== 'loading'`), and re-runs `init()` on debounced resize.

Configuration constants at the top of the IIFE:

| Constant | Value | Purpose |
|---|---|---|
| `SELECTORS.content` | `'.lumina-post-content'` | Where to find headings |
| `SELECTORS.toc` | `'#luminaToc'` | Where to render the TOC |
| `BREAKPOINT` | `1100` | Below this, do not render |
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

1. **Desktop ≥1401px**: open a post with multiple H2/H3 headings → TOC visible at right edge, 240px wide, scrolls internally if long, highlights current section while scrolling, click jumps with 80px top offset.
2. **Desktop 1101–1400px**: same post → TOC at 200px width, no overlap with article.
3. **Desktop ≤1100px**: same post → TOC not visible, no empty box, article layout unchanged.
4. **Post without H2/H3**: TOC not visible, no empty box, no console errors.
5. **Non-post page** (Blog list, About): no `#luminaToc` in DOM, no JS errors in console.
6. **Resize across 1100px boundary**: TOC appears/disappears without page reload; no duplicate observers.
7. **Mobile (≤768px)**: post content font-size, padding, sidebar drawer behavior all unchanged from current production.
8. **Anchor link click**: URL hash updates; browser back/forward still works.
9. **Post with mermaid diagrams**: TOC still built correctly (mermaid replaces `<code>` blocks, doesn't add H2/H3).

## File-Level Summary of Changes

| File | Change |
|---|---|
| `assets/js/blog-toc.js` | NEW. ~100 lines. IIFE TOC builder + IntersectionObserver + click handler + resize re-init. |
| `_sass/lumina.scss` | MODIFIED. Append `Blog TOC` section at end (~60 lines). Add `position: relative` to `.lumina-main`. |
| `_layouts/post.html` | MODIFIED. Lumina branch only: add empty `<aside id="luminaToc" hidden>` + `<script defer>` for blog-toc.js. |

No other files touched. No `_config.yml` changes. No new Jekyll plugin. No Gemfile changes. No new SCSS partial files.
