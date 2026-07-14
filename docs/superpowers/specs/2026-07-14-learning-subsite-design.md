# Learning Subsite Integration — Design Spec

**Date:** 2026-07-14
**Author:** Jonathan Liang (with Claude)
**Status:** Approved (pending user spec review)

## Goal

Add a "Learning" page to the personal Jekyll site (`ljxangus.github.io`) that lists external learning sub-sites in a card layout matching the Blog page. The first entry is "LLM 与 AI Infra 从 0 到 1", which links out to an independently-deployed MkDocs site served from a separate GitHub repo.

## Non-Goals

- Deploying the LLM AI Infra MkDocs site itself (handled separately by creating a new GitHub repo).
- Modifying the Blog page or any other existing page.
- Adding "Learning" as a section on the homepage Lumina layout (user explicitly chose top-nav-only).
- Embedding the sub-site content inside the Jekyll repo.

## Architecture

### Pieces

1. **Jekyll collection `_learning/`** — one Markdown file per learning resource.
   Front matter fields:
   - `title` (string, required)
   - `date` (date, required — used for sorting & display)
   - `description` (string, required — shown as excerpt)
   - `external_url` (string, required — where the card title links to)
   - `tag` (string, optional)
   - `readTime` (string, optional — e.g. "1–2 周通读")
   - `cover` (string, optional — image path, not used in v1 layout but reserved)

2. **Top nav entry** — append to `_data/nav.yml` `links` list:
   ```yaml
   - title: Learning
     url: learning.html
     icon: fas fa-graduation-cap
   ```
   Placement: after `News` (i.e., last item).

3. **Landing page** — `pages/learning.html`.
   - Front matter:
     ```yaml
     ---
     layout: page
     permalink: /learning.html
     title: Learning
     description: Curated learning resources and tutorials
     ---
     ```
   - Body: Lumina blog-article card markup copied from `pages/blog.html` lines 8–212, with three differences:
     - Container class `lumina-learning-posts` (instead of `lumina-blog-posts`).
     - Iteration source `site.learning` (instead of `site.posts`); no `/projects/` filter needed (collection has no such subpath).
     - Title link and "Read Article" link use `post.external_url` with `target="_blank"` (instead of `post.url`).
   - Excerpt fallback chain: `post.description` → `post.excerpt` → `post.content` (same as Blog).
   - No Dumbarton fallback branch (site is Lumina-only).

4. **First entry file** — `_learning/llm-ai-infra-0-to-1.md`.
   ```yaml
   ---
   title: "LLM 与 AI Infra 从 0 到 1"
   date: 2026-07-14
   description: "面向工程师的 LLM 与 AI 基础设施入门教材，覆盖 Transformer → 预训练 → 后训练 → 推理优化 → 部署架构 → 向量数据库 → Agent 全链路。"
   external_url: "https://ljxangus.github.io/llm-0-to-1/"
   tag: LLM
   readTime: "1–2 周通读"
   ---

   面向工程师的 LLM 与 AI 基础设施入门教材，覆盖 Transformer → 预训练 → 后训练 → 推理优化 → 部署架构 → 向量数据库 → Agent 全链路。15 章 + 附录约 200+ 页。
   ```

5. **`_config.yml` collection registration:**
   ```yaml
   collections:
     learning:
       output: false
   ```
   `output: false` prevents Jekyll from generating per-entry pages on the Jekyll side (entry links go to external URLs).

### Data Flow

Homepage → click "Learning" in top nav → `/learning.html` → click card title or "Read Article" → opens external MkDocs site in a new tab.

## Page Layout & Styles

- All CSS rules from `pages/blog.html` Lumina branch (lines 10–135) are copied into `pages/learning.html` verbatim.
- All HTML template rules from `pages/blog.html` (lines 138–212) are copied, with the three changes noted above.
- Class names `.lumina-blog-article`, `.lumina-blog-meta`, `.lumina-blog-post-title`, `.lumina-blog-excerpt`, `.lumina-blog-footer`, `.lumina-blog-tags`, `.lumina-blog-tag`, `.lumina-blog-read-link` are reused as-is (consistent visual language with Blog page; no point forking the styles).
- Container class is renamed to `.lumina-learning-posts` to avoid implying the items are blog posts.
- Responsive rules at 768px breakpoint apply unchanged.

## Navigation, URLs, External Deployment

### Top Nav

Final `_data/nav.yml` `links` list order:
1. Home
2. Blog
3. Publications
4. Projects
5. News
6. Learning (new)

### URLs

- Learning page: `https://ljxangus.github.io/learning.html`
- LLM AI Infra entry's external URL: `https://ljxangus.github.io/llm-0-to-1/`

### External Deployment (out of scope for code changes in this repo)

To make the external URL resolve, the user (separately) needs to:

1. Create a new GitHub repo named exactly `llm-0-to-1` under the `ljxangus` account.
2. Push the contents of `C:\Users\User\Documents\LLM_0_to_1` into that repo (either source + GitHub Actions that runs `mkdocs build`, or just the pre-built `out/site/` output to a `docs/` folder or root).
3. Enable GitHub Pages on that repo (Settings → Pages → Source: main branch /docs or root).
4. Verify `https://ljxangus.github.io/llm-0-to-1/` serves the MkDocs index page.

This spec covers only changes to the `ljxangus.github.io` Jekyll repo.

## Error Handling

- **Empty collection:** if `_learning/` has no entries, the loop renders zero cards. Page still loads; no error.
- **Missing `external_url`:** card title link falls back to `#` (same pattern the homepage uses for `paper.html` missing).
- **Non-Lumina theme:** site uses Lumina exclusively; no fallback branch needed. If the theme is later switched, the Learning page will render through the default `layout: page` template with no styling — acceptable degradation.

## Testing & Verification

After implementation, run and verify:

1. `bundle exec jekyll build` exits 0 with no warnings beyond pre-existing ones.
2. `bundle exec jekyll serve` starts; `http://localhost:4000/` shows the homepage.
3. Top nav shows a "Learning" item at the far right (after News).
4. Clicking "Learning" loads `/learning.html`.
5. `/learning.html` renders exactly one card: "LLM 与 AI Infra 从 0 到 1" with date 2026-07-14, the description excerpt, the "LLM" tag, and a "Read Article" link.
6. The card's title link and "Read Article" link both point to `https://ljxangus.github.io/llm-0-to-1/` and open in a new tab (`target="_blank"`).
7. Visual: card layout, fonts, colors, hover effects match the Blog page cards. Take a Playwright screenshot to confirm.
8. (Deferred until external repo is deployed) the link target resolves and shows the MkDocs index page.

## Files Changed (in `ljxangus.github.io` repo)

| File | Action |
|------|--------|
| `_config.yml` | Add `collections: learning: output: false` block |
| `_data/nav.yml` | Append `Learning` entry to `links` list (after `News`) |
| `pages/learning.html` | New file — Lumina blog-article layout, iterating `site.learning` |
| `_learning/llm-ai-infra-0-to-1.md` | New file — first entry, external URL pointing at the MkDocs site |

## Open Questions

None.
