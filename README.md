# Jason Peters Website

Multipage Vue 3 site built with Vite, Tailwind CSS, and shadcn-vue style components. Authored content lives under `/content`.

## Development

```sh
npm install
npm run dev
```

## Content

Add posts as directories with an `index.md` file:

```txt
content/posts/my-post-slug/index.md
```

Each post supports frontmatter:

```md
---
title: My Post
description: Short summary for listings and SEO.
date: 2026-08-10
type: post
tags:
  - projects
schemaType: BlogPosting
---
```

The directory name becomes the URL, for example `/posts/my-post-slug/`. Assets can live beside the markdown file and be referenced with relative paths.

Use `type: graphic-art` for short archive posts that point to an externally hosted visual project:

```md
---
title: Poster Study
description: Short summary for listings and SEO.
date: 2026-08-10
type: graphic-art
externalUrl: https://www.behance.net/gallery/example
schemaType: CreativeWork
---
```

Graphic art posts still live under `content/posts/<slug>/index.md`, but the renderer displays a source panel and external project link.

Pages use the same structure:

```txt
content/pages/about/index.md
content/pages/home/index.md
```

## Components in Markdown

Markdown files are compiled as Vue components with `unplugin-vue-markdown`, so posts can render Vue components directly.

Globally available in markdown:

```md
<MarkdownCallout title="Note">
This is rendered by `src/components/content/MarkdownCallout.vue`.
</MarkdownCallout>

<Button as="a" href="/about" variant="outline">
About this site
</Button>
```

For post-specific components, import them inside the markdown file:

```md
<script setup>
import Demo from './Demo.vue'
</script>

<Demo />
```

Reusable markdown components should live in `src/components/content`. shadcn-vue primitives live in `src/components/ui`.

## Schema

`npm run build` injects JSON-LD into each generated route.

Defaults:

- `/` uses `WebSite`
- `/posts/` uses `Blog`
- `content/pages/*` uses `WebPage`
- `content/posts/*` uses `BlogPosting`
- `content/posts/*` with `type: graphic-art` uses `CreativeWork`

Override the schema type with `schemaType` in frontmatter:

```md
---
title: About
description: About Jason Peters.
schemaType: AboutPage
---
```

## GitHub Pages

`npm run build` runs Vite and then `scripts/generate-static-pages.mjs`. That script creates static `index.html` files for `/`, `/about/`, `/posts/`, and every markdown post, plus `dist/404.html` as a fallback for unknown client-side routes.

The included workflow deploys `dist` to GitHub Pages on pushes to `main`.
