# Jason Peters Website

Multipage Vue 3 site built with Vite, Tailwind CSS, and shadcn-vue style components. Authored content lives under `/content`.

## Development

```sh
npm install
npm run dev
```

## Content Publishing

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

Required fields for normal posts are `title`, `description`, `date`, and `tags`. Optional fields include `updated`, `image`, `imageAlt`, `canonical`, `draft`, `type`, `externalUrl`, and `schemaType`.

Use explicit descriptions. The build may warn about missing, duplicated, very short, or very long metadata, but it does not try to manufacture SEO copy from article prose.

Recommended technical post frontmatter:

```md
---
title: Running Multiple WordPress Plugins with wp-env
description: Configure one wp-env development environment to load multiple local WordPress plugins.
date: 2026-08-11
updated: 2026-08-12
type: post
tags:
  - WordPress
  - Development
image: /images/posts/wp-env.webp
imageAlt: wp-env development environment
schemaType: BlogPosting
---
```

`updated` should only be set when the article has been materially revised. It must not be earlier than `date`.

`draft: true` prevents a post from being published, included in the sitemap, RSS feed, topic pages, related-post logic, or LLM files.

Custom social images use `image` and `imageAlt`. Relative image paths are resolved from the post directory. If no valid custom image exists, metadata falls back to the default site social image at `/images/social/default-og.png`; the fallback is not rendered as an article image.

Tags are normalized against the central topic definitions in `site.config.json`. Known aliases such as `Vue.js`/`vuejs`, `wp-env`/`WordPress`, and `incus`/`containers` map to canonical topics. Topic pages are generated automatically only after a topic reaches the configured publication threshold, so a one-off tag does not create a thin indexable page.

`canonical` may be used for a deliberate canonical override. Keep it absolute on `https://jasonjpeters.com` or root-relative.

A reusable draft template lives at `content/_templates/post.md`; files in `_templates` are not published.

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
