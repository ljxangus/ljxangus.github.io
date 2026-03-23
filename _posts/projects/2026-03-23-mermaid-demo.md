---
layout: project-detail
title: "Mermaid.js Integration Demo"
description: "Demonstration of Mermaid.js diagrams in project pages"
date: 2026-03-23
tech:
  - Mermaid.js
  - Jekyll
  - Markdown
github: https://github.com/mermaid-js/mermaid
link: https://mermaid.js.org
---

This project demonstrates the integration of Mermaid.js for rendering beautiful diagrams in project detail pages. The diagrams below are defined using Mermaid syntax and automatically rendered when the page loads.

## System Architecture

Here's a high-level architecture diagram showing how Mermaid.js integrates with Jekyll:

```mermaid
flowchart TD
    A[Markdown File] --> B[Jekyll Build]
    B --> C[HTML Output]
    C --> D[Browser Loads Page]
    D --> E[Mermaid.js CDN]
    E --> F[Render Diagrams]
```

## Request Flow

This sequence diagram shows how a user request flows through the system:

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant GitHub Pages
    participant Jekyll
    participant Mermaid CDN

    User->>Browser: Visit project page
    Browser->>GitHub Pages: GET request
    GitHub Pages->>Jekyll: Build site
    Jekyll-->>GitHub Pages: HTML with mermaid blocks
    GitHub Pages-->>Browser: Rendered HTML
    Browser->>Mermaid CDN: Load mermaid.js
    Mermaid CDN-->>Browser: Mermaid library
    Browser->>Browser: Render diagrams
    Browser-->>User: Visual diagrams displayed
```

## Component Structure

The class diagram below shows the key components in this integration:

```mermaid
classDiagram
    class ProjectPage {
        +title: String
        +description: String
        +tech: String[]
        +content: String
        +render()
    }

    class MermaidRenderer {
        +initialize(config)
        +render(element)
        +parse(source)
    }

    class DiagramBlock {
        +type: String
        +source: String
        +renderAsSVG()
    }

    ProjectPage --> MermaidRenderer: uses
    ProjectPage "1" --> "*" DiagramBlock: contains
    MermaidRenderer --> DiagramBlock: renders
```

## Processing States



```mermaid
stateDiagram-v2
    [*] --> Parsing
    Parsing --> Rendering: Valid Syntax
    Parsing --> Error: Invalid Syntax
    Error --> [*]
    Rendering --> Displayed: Success
    Rendering --> Error: Failure
    Displayed --> [*]
```

## Benefits

Using Mermaid.js for diagrams offers several advantages:

1. **Text-based**: Write diagrams as code, version control friendly
2. **Automatic rendering**: No manual image creation needed
3. **Consistent styling**: Uniform appearance across all diagrams
4. **Easy updates**: Modify the code to update the diagram
5. **Multiple types**: Support for flowcharts, sequence diagrams, and more

## Supported Diagram Types

```mermaid
mindmap
  root((Mermaid Diagrams))
    Flowchart
      TD
      LR
    Sequence
      Participants
      Messages
    Class
      Relationships
      Methods
    State
      Transitions
      Actions
    Mindmap
      Hierarchical
      Radial
    Gantt
      Tasks
      Timeline
```

## Implementation Details

The Mermaid.js integration required minimal code changes:

1. **CDN Inclusion**: Added Mermaid.js script to the layout template
2. **Initialization**: Configured Mermaid with appropriate settings
3. **Styling**: Added CSS for proper diagram rendering
4. **Content**: Created example content with mermaid code blocks

### Configuration

```mermaid
flowchart LR
    subgraph Config
        A[StartOnLoad: true]
        B[Theme: default]
        C[SecurityLevel: loose]
    end

    Config --> D{Mermaid Initialize}
    D --> E[Ready to Render]
```

## Future Enhancements

Potential improvements for this integration:

- Add theme selection options
- Support for custom diagram themes
- Export diagrams as SVG or PNG
- Interactive diagram elements
- Dark mode support for diagrams

## Conclusion

This demo shows how easy it is to integrate Mermaid.js into your Jekyll site for creating beautiful, maintainable diagrams. The text-based approach makes it perfect for technical documentation and project pages.
