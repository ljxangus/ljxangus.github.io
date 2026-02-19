# Jiaxin's Academic Homepage

A modern, responsive academic personal website built with [Jekyll](https://jekyllrb.com/) and the customized Lumina theme. Features automated publication updates from Google Scholar, project showcases, and a clean, professional design optimized for both desktop and mobile devices.

![Website Status](https://img.shields.io/badge/status-active-success)
![Jekyll](https://img.shields.io/badge/Jekyll-4.3-red)
![Theme](https://img.shields.io/badge/theme-Lumina-teal)

## ✨ Main Features

### 📚 Publications Management
- **Automated Updates**: Python scripts automatically fetch publication data from Google Scholar
- **AI-Powered Summaries**: Optional AI analysis generates keywords, summaries, and contributions
- **Categorization**: Separate display for journal papers and conference papers
- **Full-Text Links**: Direct links to PDF and publisher pages
- **Highlight System**: Mark important publications for homepage display

### 🚀 Project Showcase
- **Detail Pages**: In-depth project descriptions with images, tech tags, and links
- **Grid Layout**: Responsive card-based grid layout for project browsing
- **Categorization**: Projects organized by technology and application domain
- **Interactive**: Click-through to dedicated project pages with full information

### 📝 Blog & News
- **Markdown Posts**: Write blog posts in Markdown with automatic formatting
- **News Timeline**: Chronological news and updates display
- **Tag System**: Organize and filter content by tags

### 📱 Responsive Design
- **Mobile-First**: Optimized for mobile devices with hamburger menu
- **Touch-Friendly**: Large tap targets and smooth animations
- **Adaptive Layout**: Sidebar navigation on desktop, slide-out menu on mobile

### 🎨 Customization
- **Lumina Theme**: Modern, clean aesthetic with teal accent colors
- **Flexible Configuration**: Easy customization via YAML files
- **Navigation**: Customizable menu links and social media profiles

## 🏗️ Site Structure

```
ljxangus.github.io/
├── _config.yml              # Jekyll configuration
├── _data/                   # Data files for site content
│   ├── projects.yml         # Project showcase data
│   ├── publist.yml          # Publication list
│   ├── news.yml             # News and updates
│   ├── nav.yml              # Navigation menu
│   └── themes.yml           # UI theme configurations
├── _includes/               # Reusable HTML components
│   ├── head.html            # HTML head (meta tags, styles)
│   ├── footer.html          # Site footer
│   └── sidebar-nav.html     # Sidebar navigation
├── _layouts/                # Page layout templates
│   ├── default.html         # Default layout
│   ├── home.html            # Homepage layout
│   ├── page.html            # Static page layout
│   ├── post.html            # Blog post layout
│   └── project-detail.html  # Project detail page layout
├── _posts/                  # Blog posts and project details
│   ├── projects/            # Individual project detail pages
│   └── *.md                 # Blog posts
├── _sass/                   # SCSS source files
│   └── lumina.scss          # Lumina theme styles
├── assets/                  # Static assets
│   ├── img/                 # Images
│   │   ├── projects/        # Project images
│   │   └── icons/           # Icons and favicons
│   └── pdf/                 # Research papers and documents
├── pages/                   # Standalone pages
│   ├── index.html           # Homepage
│   ├── blog.html            # Blog listing
│   ├── publications.html    # Publications page
│   ├── projects.html        # Projects showcase
│   └── news.html            # News archive
├── css/                     # Compiled CSS
│   └── main.css             # Main stylesheet
├── scripts/                 # Python utility scripts
│   └── update_publications.py  # Publication updater
└── README.md                # This file
```

## 🛠️ Tech Stack

### Core Technologies
- **Jekyll 4.3**: Static site generator
- **Ruby 2.7+**: Backend language
- **Liquid**: Template engine
- **Markdown**: Content authoring
- **SCSS**: Styling with variables and nesting

### Frontend
- **Bootstrap 4.6**: Responsive framework
- **Font Awesome 6.4**: Icon library
- **Google Fonts**: Typography (Playfair Display, Inter)
- **Animate.css**: CSS animations

### Backend Automation
- **Python 3.7+**: Update scripts
- **BeautifulSoup4**: Web scraping
- **Requests**: HTTP library
- **Silicon Flow API**: AI-powered summaries (optional)

### Deployment
- **GitHub Pages**: Hosting platform
- **Git**: Version control

## 🚀 Quick Start

### Prerequisites

- **Ruby**: Version 2.5 or higher
- **Bundler**: Ruby dependency manager
- **Python 3.7+**: For update scripts (optional)
- **Git**: Version control

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ljxangus/ljxangus.github.io.git
   cd ljxangus.github.io
   ```

2. **Install Ruby dependencies**:
   ```bash
   # macOS (avoid system Ruby permission issues)
   bundle config set --local path 'vendor/bundle'
   bundle install
   ```

3. **Install Python dependencies** (optional, for automated updates):
   ```bash
   pip install -r requirements.txt
   ```

### Local Development

1. **Start the development server**:
   ```bash
   bundle exec jekyll serve
   ```

2. **Open your browser**:
   ```
   http://localhost:4000
   ```

3. **Edit files and save** - Jekyll auto-regenerates the site

### Build for Production

```bash
# Build static site
bundle exec jekyll build

# Output is in _site/ directory
```

## 📝 Content Management

### Adding Publications

**Option 1: Automated (Recommended)**
```bash
python scripts/update_publications.py
```

**Option 2: Manual**
Edit `_data/publist.yml`:
```yaml
- title: "Your Paper Title"
  author: Your Name, Coauthor Name
  source: Journal Name, Volume (Year)
  type: journal
  pdf: /path/to/paper.pdf
  html: https://doi.org/...
  showFront: true  # Highlight on homepage
```

### Adding Projects

1. **Add project data** to `_data/projects.yml`:
   ```yaml
   - name: "Project Name"
     id: project-id
     description: "Brief description..."
     link: https://project-url.com
     image: /assets/img/projects/project.png
     tech:
       - Technology 1
       - Technology 2
   ```

2. **Create detail page** `_posts/projects/YYYY-MM-DD-project-id.md`:
   ```yaml
   ---
   layout: project-detail
   title: Project Title
   id: project-id
   permalink: /projects/project-id.html
   image: /assets/img/projects/project.png
   tech:
     - Tech 1
     - Tech 2
   categories: projects
   date: YYYY-MM-DD
   ---

   ## Overview
   Project description...
   ```

3. **Add to navigation** - Edit `pages/projects.html`:
   ```html
   {% if project.id == 'project-id' %}
     {% assign has_detail_page = true %}
   {% endif %}
   ```

### Adding Blog Posts

Create `_posts/YYYY-MM-DD-post-title.md`:
```yaml
---
layout: post
title: "Post Title"
date: YYYY-MM-DD
categories: blog
---

Your post content in Markdown...
```

### Customizing Navigation

Edit `_data/nav.yml`:
```yaml
links:
  - title: Page Title
    url: page.html
    icon: fas fa-icon-name
```

## 🎨 Customization

### Theme Settings

Edit `_config.yml`:
```yaml
# Site information
title: Your Name
description: Your tagline
author: Your Name

# Theme selection
ui_theme: lumina

# Social links
github: username
linkedin: username
email: email@example.com
```

### Styling

Main styles: `_sass/lumina.scss`
- Color variables at top of file
- Mobile-responsive breakpoints at 768px
- Component styles for cards, buttons, etc.

Compiled CSS: `css/main.css`
- Generated from SCSS
- Direct edits allowed for quick changes

### Layout Templates

- `_layouts/default.html`: Base layout with sidebar
- `_layouts/page.html`: Static pages
- `_layouts/post.html`: Blog posts
- `_layouts/project-detail.html`: Project details

## 🚢 Deployment

### GitHub Pages (Automatic)

1. **Push to master branch**:
   ```bash
   git add .
   git commit -m "Update site"
   git push origin master
   ```

2. **GitHub Actions** automatically builds and deploys

3. **Access your site**: `https://username.github.io`

### Deployment Checklist

- [ ] Test locally: `bundle exec jekyll serve`
- [ ] Check for broken links
- [ ] Verify YAML syntax in `_data/*.yml`
- [ ] Update publications: `python scripts/update_publications.py`
- [ ] Review `git status` before committing
- [ ] Avoid committing `_site/` directory (auto-generated)

## 📊 Automated Publication Updates

### Configuration

Edit `config.json`:
```json
{
  "scholar_id": "your-google-scholar-id",
  "api_key": "your-api-key",  // Optional, for AI features
  "last_update": "timestamp"
}
```

### Running Updates

```bash
# Full update with AI analysis
python scripts/update_publications.py

# Update without AI
python scripts/update_publications.py --no-ai

# Fetch only (don't update files)
python scripts/update_publications.py -f
```

### What It Does

1. Scrapes Google Scholar profile for publications
2. Compares with existing `_data/publist.yml`
3. Identifies new papers
4. Generates AI summaries (optional)
5. Creates project detail pages
6. Updates `_data/projects.yml`
7. Creates backups in `backups/`

## 🐛 Troubleshooting

### Jekyll Build Fails

```bash
# Clean build cache
bundle exec jekyll clean

# Rebuild
bundle exec jekyll build --trace
```

### Port Already in Use

```bash
# Find process on port 4000
lsof -i :4000

# Kill process
kill -9 <PID>
```

### Ruby Version Issues

```bash
# Check Ruby version
ruby --version

# Install correct version using rbenv
rbenv install 2.7.0
rbenv local 2.7.0
```

### GitHub Pages Build Errors

- Check Ruby version in `Gemfile`
- Review build logs in repository Settings > Pages
- Test locally: `bundle exec jekyll build`

## 📈 Maintenance

### Regular Tasks

- **Weekly**: Run `update_publications.py` for new papers
- **Monthly**: Review and update project information
- **Quarterly**: Check for broken links, update dependencies

### Backup Strategy

- Automatic backups created in `backups/` directory
- Keeps last 7 days of data file backups
- Git history provides full version control

## 📧 Contact

- **Website**: https://ljxangus.github.io
- **Email**: jiax.l@outlook.com
- **GitHub**: [@ljxangus](https://github.com/ljxangus)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Dumbarton Theme**: Original Jekyll theme by [Tyler Butler](https://tbutler.org)
- **Lumina Theme**: Custom theme extension and modernization
- **Font Awesome**: Icon library
- **Bootstrap**: Responsive framework
- **Jekyll**: Static site generator

---

**Last Updated**: February 2025

**Built with**: Jekyll 4.3, Ruby 2.7, Python 3.9
