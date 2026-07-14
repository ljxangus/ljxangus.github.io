# Learning Subsite Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Learning page to the Jekyll site that lists external learning sub-sites in Lumina blog-article cards; the first entry links to the independently-deployed "LLM 与 AI Infra 从 0 到 1" MkDocs site.

**Architecture:** New Jekyll collection `_learning/` holds one Markdown file per learning resource. A new `pages/learning.html` page reuses the Lumina blog-article card markup from `pages/blog.html` but iterates `site.learning` and links each card to the entry's `external_url` in a new tab. Top nav gets a "Learning" entry appended after "News".

**Tech Stack:** Jekyll 4 (Ruby), kramdown, Lumina theme (in-repo SCSS/HTML), GitHub Pages deployment target.

**Spec:** `docs/superpowers/specs/2026-07-14-learning-subsite-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `_config.yml` | Add `collections: learning: output: false` block — registers the collection without generating per-entry Jekyll pages |
| `_data/nav.yml` | Append `Learning` link to the end of the nav `links` list |
| `pages/learning.html` (new) | Single page that iterates `site.learning` and renders one Lumina blog-article card per entry; title and "Read Article" links point to `external_url` with `target="_blank"` |
| `_learning/llm-ai-infra-0-to-1.md` (new) | First entry. Front matter holds title/date/description/external_url/tag/readTime; body is one-paragraph excerpt |

---

### Task 1: Register the `_learning` collection in `_config.yml`

**Files:**
- Modify: `_config.yml` (add a `collections:` block after the existing `defaults:` block, before the JEKYLL SCHOLAR SETTINGS section)

- [ ] **Step 1: Read current `_config.yml` to confirm the insertion point**

Run: `bundle exec jekyll --version` (just to confirm Jekyll is callable)
Then read `_config.yml` and locate the `defaults:` block (around line 119–125) and the `# JEKYLL SCHOLAR SETTINGS` comment (around line 127).

- [ ] **Step 2: Insert the collections block**

Using the Edit tool on `_config.yml`, replace this exact block:

```yaml
defaults:
  -
    scope:
      path: ""      # empty string for all files
      type: posts   # limit to posts
    values:
      is_post: true # automatically set is_post=true for all posts

# =======================================#
# -----JEKYLL SCHOLAR SETTINGS-----------#
#========================================#
```

with:

```yaml
defaults:
  -
    scope:
      path: ""      # empty string for all files
      type: posts   # limit to posts
    values:
      is_post: true # automatically set is_post=true for all posts

# =======================================#
# -----COLLECTIONS-----------------------#
#========================================#
collections:
  learning:
    output: false

# =======================================#
# -----JEKYLL SCHOLAR SETTINGS-----------#
#========================================#
```

- [ ] **Step 3: Verify the YAML is still valid**

Run: `bundle exec jekyll doctor`
Expected: exits 0; no new warnings about `_config.yml`. (Pre-existing YAML warnings in `backups/` are fine to ignore.)

- [ ] **Step 4: Commit**

```bash
git add _config.yml
git commit -m "Register _learning collection in _config.yml"
```

---

### Task 2: Append "Learning" entry to top nav

**Files:**
- Modify: `_data/nav.yml` (append a new entry to the `links` list after `News`)

- [ ] **Step 1: Read `_data/nav.yml` to confirm the current end of the `links` list**

Current last item:
```yaml
- title: News
  url: news.html
  icon: fas fa-newspaper
```

- [ ] **Step 2: Append the Learning entry**

Using the Edit tool on `_data/nav.yml`, replace:

```yaml
- title: News
  url: news.html
  icon: fas fa-newspaper
```

with:

```yaml
- title: News
  url: news.html
  icon: fas fa-newspaper

- title: Learning
  url: learning.html
  icon: fas fa-graduation-cap
```

- [ ] **Step 3: Verify YAML validity**

Run: `bundle exec jekyll doctor`
Expected: exits 0; no YAML errors in `_data/nav.yml`.

- [ ] **Step 4: Commit**

```bash
git add _data/nav.yml
git commit -m "Add Learning item to top nav"
```

---

### Task 3: Create the first entry file `_learning/llm-ai-infra-0-to-1.md`

**Files:**
- Create: `_learning/llm-ai-infra-0-to-1.md`

- [ ] **Step 1: Create the directory and file**

Using the Write tool, create `_learning/llm-ai-infra-0-to-1.md` with this exact content:

```markdown
---
title: "LLM 与 AI Infra 从 0 到 1"
date: 2026-07-14
description: "面向工程师的 LLM 与 AI 基础设施入门教材，覆盖 Transformer → 预训练 → 后训练 → 推理优化 → 部署架构 → 向量数据库 → Agent 全链路。"
external_url: "https://ljxangus.github.io/llm-ai-infra-0-to-1/"
tag: LLM
readTime: "1–2 周通读"
---

面向工程师的 LLM 与 AI 基础设施入门教材，覆盖 Transformer → 预训练 → 后训练 → 推理优化 → 部署架构 → 向量数据库 → Agent 全链路。15 章 + 附录约 200+ 页，配合习题与术语表，可 1–2 周通读完成。
```

- [ ] **Step 2: Verify the file exists and Jekyll picks up the collection**

Run: `bundle exec jekyll build`
Expected: build completes with no error; no warning about the `_learning/` collection being unrecognized. (Output mentioning "Regenerating" is fine.)

- [ ] **Step 3: Commit**

```bash
git add _learning/llm-ai-infra-0-to-1.md
git commit -m "Add LLM AI Infra 0-to-1 as first Learning entry"
```

---

### Task 4: Create `pages/learning.html` (Lumina card layout, iterating `site.learning`)

**Files:**
- Create: `pages/learning.html`

- [ ] **Step 1: Create the page file with front matter and the Lumina style block**

Using the Write tool, create `pages/learning.html` with this exact content:

```html
---
layout: page
permalink: /learning.html
title: Learning
description: Curated learning resources and tutorials
---

{% if site.ui_theme == 'lumina' %}
<!-- Lumina Theme Learning Layout -->
<style>
  .highlighted {
    color: #0f766e;
    text-decoration: none;
    border-bottom: 1px dashed #0f766e;
  }
  .highlighted:hover {
    border-bottom-style: solid;
  }

  /* Learning Article (mirrors .lumina-blog-article) */
  .lumina-learning-article {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .lumina-learning-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    color: #64748b;
    margin-bottom: 0.75rem;
  }

  .lumina-learning-date {
    font-weight: 500;
  }

  .lumina-learning-read-time {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .lumina-learning-post-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.75rem;
    transition: color 0.2s ease;
  }

  .lumina-learning-post-title a {
    color: inherit;
    text-decoration: none;
  }

  .lumina-learning-article:hover .lumina-learning-post-title {
    color: #0f766e;
  }

  .lumina-learning-excerpt {
    color: #475569;
    line-height: 1.75;
    margin-bottom: 1rem;
  }

  .lumina-learning-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .lumina-learning-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .lumina-learning-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    background: #ccfbf1;
    color: #0f766e;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid #99f6e4;
  }

  .lumina-learning-read-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: #0d9488;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    opacity: 0;
    transform: translateX(-0.5rem);
    transition: all 0.2s ease;
  }

  .lumina-learning-article:hover .lumina-learning-read-link {
    opacity: 1;
    transform: translateX(0);
  }

  .lumina-learning-read-link:hover {
    color: #0f766e;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .lumina-learning-post-title {
      font-size: 1.5rem;
    }

    .lumina-learning-footer {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .lumina-learning-read-link {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>

<!-- Learning Entries -->
<div class="lumina-learning-posts">
  {% for post in site.learning %}
  <article class="lumina-learning-article">
    <!-- Meta: Date and Read Time -->
    <div class="lumina-learning-meta">
      <time class="lumina-learning-date">{{ post.date | date: "%B %d, %Y" }}</time>
      {% if post.readTime %}
      <span>•</span>
      <div class="lumina-learning-read-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>{{ post.readTime }}</span>
      </div>
      {% endif %}
    </div>

    <!-- Title -->
    <h2 class="lumina-learning-post-title">
      <a href="{% if post.external_url %}{{ post.external_url }}{% else %}#{% endif %}" target="_blank" rel="noopener">{{ post.title }}</a>
    </h2>

    <!-- Excerpt -->
    <div class="lumina-learning-excerpt">
      {% if post.description %}
        {{ post.description }}
      {% elsif post.excerpt %}
        {{ post.excerpt | strip_html | truncate: 500 }}
      {% else %}
        {{ post.content | strip_html | truncate: 500 }}
      {% endif %}
    </div>

    <!-- Footer: Tags and Read Link -->
    <div class="lumina-learning-footer">
      <!-- Tags -->
      <div class="lumina-learning-tags">
        {% if post.tag %}
          <span class="lumina-learning-tag">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            {{ post.tag }}
          </span>
        {% endif %}
      </div>

      <!-- Read Article Link -->
      <a href="{% if post.external_url %}{{ post.external_url }}{% else %}#{% endif %}" class="lumina-learning-read-link" target="_blank" rel="noopener">
        Read Article
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </a>
    </div>
  </article>
  {% endfor %}
</div>

{% else %}
<!-- Non-Lumina fallback: simple list -->
<div class="col-md-12">
  {% for post in site.learning %}
  <div class="blogcard mb-4 mt-4" style="width: 100%;">
    <h3><a href="{{ post.external_url }}" target="_blank" rel="noopener">{{ post.title }}</a></h3>
    <p>{{ post.description }}</p>
  </div>
  {% endfor %}
</div>
{% endif %}
```

- [ ] **Step 2: Verify the build picks it up**

Run: `bundle exec jekyll build`
Expected: build exits 0; output mentions generating `/learning.html`.

- [ ] **Step 3: Start the dev server and verify the page renders**

Run: `bundle exec jekyll serve` (in a separate terminal or background it)

Then open `http://localhost:4000/learning.html` in a browser.

Expected:
- Page loads with the Lumina card layout.
- One card is visible: title "LLM 与 AI Infra 从 0 到 1", date "July 14, 2026", tag "LLM", read time "1–2 周通读", description starting with "面向工程师的 LLM 与 AI 基础设施入门教材…".
- Card title link `href` is `https://ljxangus.github.io/llm-ai-infra-0-to-1/` and has `target="_blank"`.
- "Read Article" link has the same `href` and `target="_blank"`.

- [ ] **Step 4: Verify the top nav links correctly**

Open `http://localhost:4000/` in the browser.

Expected:
- Top nav shows "Learning" at the far right (after "News").
- Clicking "Learning" navigates to `/learning.html`.

- [ ] **Step 5: Take a Playwright screenshot for visual verification**

Use the Playwright MCP tools to navigate to `http://localhost:4000/learning.html` and capture a screenshot. Compare visually with `http://localhost:4000/blog.html` — card layout, fonts, colors, hover effects should match.

- [ ] **Step 6: Stop the dev server**

Press `Ctrl+C` in the terminal running `jekyll serve` (or use `TaskStop` on the background task).

- [ ] **Step 7: Commit**

```bash
git add pages/learning.html
git commit -m "Add Learning page with Lumina card layout"
```

---

### Task 5: Final verification

**Files:** None modified in this task — verification only.

- [ ] **Step 1: Clean build**

Run: `bundle exec jekyll clean && bundle exec jekyll build`
Expected: build exits 0; no errors. `_site/learning.html` exists.

- [ ] **Step 2: Confirm `_site/learning.html` contains the expected content**

Run a grep on `_site/learning.html` for `LLM 与 AI Infra 从 0 到 1` and `https://ljxangus.github.io/llm-ai-infra-0-to-1/`.

Expected: both strings appear in the rendered HTML.

- [ ] **Step 3: Confirm the nav HTML contains the Learning link**

Run a grep on `_site/index.html` for `learning.html` and `Learning`.

Expected: both appear; the Learning nav item is rendered.

- [ ] **Step 4: Push to origin**

This step requires user authorization (push to remote). Confirm with the user before running.

```bash
git push origin master
```

Expected: push succeeds. GitHub Pages rebuild triggers within 1–3 minutes.

- [ ] **Step 5: Verify on production**

After GitHub Pages rebuild completes, visit `https://ljxangus.github.io/learning.html` and confirm:
- Page loads.
- One card visible with the LLM AI Infra entry.
- Top nav has "Learning" at the far right.

The "Read Article" link target (`https://ljxangus.github.io/llm-ai-infra-0-to-1/`) will NOT resolve yet — that's the separate out-of-scope task of deploying the LLM_0_to_1 repo. Note this in the completion report.

---

## Out of Scope (Tracked in Spec, Not Implemented Here)

- Creating the `ljxangus/llm-ai-infra-0-to-1` GitHub repo.
- Pushing `C:\Users\User\Documents\LLM_0_to_1` contents to that repo.
- Enabling GitHub Pages on that repo.

These steps are the user's responsibility (or a separate task). The Jekyll repo changes only reference the expected URL.
