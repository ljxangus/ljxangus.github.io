# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an academic personal website built with the Dumbarton Jekyll theme. The site automatically fetches and updates publication data from Google Scholar using Python scripts, then builds the static site with Jekyll.

## Development Commands

### Jekyll (Ruby) Commands

```bash
# Install Jekyll dependencies (first time or when Gemfile changes)
bundle install

# Build the site
bundle exec jekyll build

# Start local development server (http://localhost:4000)
bundle exec jekyll serve

# Clean build artifacts
bundle exec jekyll clean

# Check configuration issues
bundle exec jekyll doctor

# Build with detailed error trace
bundle exec jekyll build --trace
```

### Python Commands (Update Script)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Full update: fetch data from Google Scholar and update site files
python update_publications.py

# Fetch-only mode: scrape data without updating files
python update_publications.py -f
python update_publications.py --fetch-only

# Update without AI analysis
python update_publications.py --no-ai
```

### Git Commands

```bash
# Pull latest changes
git pull origin master

# View status
git status

# Stage and commit
git add <files>
git commit -m "message"
```

## Architecture

### Data Flow

1. **Data Source**: Google Scholar profile (user ID stored in `config.json`)
2. **Scraping**: `update_publications.py` scrapes publication metadata via BeautifulSoup
3. **Processing**: Script compares new data with existing files, identifies additions/updates
4. **AI Analysis** (optional): Uses Silicon Flow API (DeepSeek model) to generate summaries, keywords, contributions
5. **File Updates**:
   - `_data/publist.yml`: Main publication list for publications page
   - `_data/projects.yml`: Project cards for home page highlights
   - `_posts/projects/`: Individual detailed pages for each paper
6. **Build**: Jekyll generates static HTML from Markdown + Liquid templates
7. **Backup**: Automatic backups to `backups/` directory (keeps last 7 days)

### Key Configuration Files

| File | Purpose |
|------|---------|
| `_config.yml` | Jekyll site configuration (theme, plugins, scholar settings) |
| `config.json` | Runtime config for Python script (Scholar ID, API keys, last update) |
| `Gemfile` | Ruby/Jekyll dependencies |
| `requirements.txt` | Python dependencies for update script |
| `_data/publist.yml` | Publication entries (title, authors, source, links) |
| `_data/projects.yml` | Project entries (name, description, image, tech tags) |
| `_data/themes.yml` | UI color schemes for the Dumbarton theme |

### Directory Structure

- `_data/`: YAML data files for Jekyll (publist, projects, sections, etc.)
- `_posts/`: Blog posts and project detail pages (`_posts/projects/` for papers)
- `_includes/`: Reusable Liquid template snippets (head, footer, nav, etc.)
- `_layouts/`: Page layout templates
- `_sass/`: SCSS stylesheets
- `assets/`: Static assets (images, js, css)
- `pages/`: Standalone HTML pages (blog, publications, about, etc.)
- `logs/`: Python script logs (date-named)
- `backups/`: Timestamped backups of data files
- `_site/`: Generated static site (ignored by git)

### Publication vs Project Entries

The site maintains two parallel data structures:

**`publist.yml`**: Used for the Publications page. Contains complete citation info:
- `title`, `author`, `source` (journal/conference + year)
- `type`: "journal" or "conference"
- `html`, `pdf`: Links to paper
- `showFront`: Whether to highlight on homepage

**`projects.yml`**: Used for homepage highlight cards. Contains:
- `name`, `id`, `description`
- `link`, `image`
- `tech`: Technology/keyword tags
- `source`: Origin (Google Scholar Paper vs. manual project)

The update script keeps these in sync by comparing titles and updating `projects.yml` when new papers appear in `publist.yml`.

## Update Script Workflow

`update_publications.py` executes these steps:

1. Load config from `config.json` (Scholar ID, API keys, last update timestamp)
2. Scrape Google Scholar profile for publications
3. Load existing data from `_data/publist.yml` and `_data/projects.yml`
4. Compare to identify new papers
5. Perform differential analysis between projects and papers
6. If AI enabled: Call Silicon Flow API (DeepSeek) for each new paper to generate:
   - Keywords
   - Background
   - Contributions
   - Abstract
   - Project summary
   - Image suggestion
7. Generate individual post files in `_posts/projects/`
8. Update `_data/publist.yml` with new entries
9. Update `_data/projects.yml` with new project cards
10. Create backup (if interval passed)
11. Save updated timestamp to config

## Important Notes

- **Jekyll Scholar is disabled** in this site (commented out in `_config.yml` and `Gemfile` due to GitHub Pages incompatibility). Publications are managed via `publist.yml` instead.
- **Config changes require restart**: Modifying `_config.yml` requires stopping and restarting `jekyll serve`.
- **Theme selection**: Set via `ui_theme` in `_config.yml` (references entry in `_data/themes.yml`).
- **Gitalk comments**: Configured in `_config.yml` but requires correct GitHub app credentials.
- **Windows/WSL path handling**: In WSL, access Windows paths via `/mnt/c/Users/...`
- **Chinese characters in paths**: Working directory contains Chinese characters - this works fine in modern tools but may cause issues with older utilities.

## Troubleshooting

### YAML Format Errors

Common causes in `_data/*.yml` files:
- Missing quotes around values with colons (`:`) or special characters
- Inconsistent indentation (must use spaces, not tabs)
- Trailing whitespace

Use online YAML validator or `ruamel.yaml` (included in `update_publications.py`) to validate.

### Python Script Issues

- Check logs in `logs/update_publications_YYYYMMDD.log`
- Network issues: Verify Google Scholar accessibility, consider proxy
- API failures: Check Silicon Flow API key in `config.json`
- Missing dependencies: `pip install -r requirements.txt`

### Jekyll Build Issues

- Clean build cache: `bundle exec jekyll clean`
- Check Ruby version (requires 2.5+): `ruby --version`
- Verify Gemfile dependencies: `bundle install`
- Use `--trace` flag for detailed stack traces

### Future Date Posts

Jekyll skips posts with future dates by default. Check post filenames and front matter `date` field.
