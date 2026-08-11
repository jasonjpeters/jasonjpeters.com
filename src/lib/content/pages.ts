import type { Component } from 'vue'
import { parseFrontmatter } from './frontmatter'

export type PageFrontmatter = {
  title: string
  seoTitle?: string
  description?: string
  eyebrow?: string
  heroTitle?: string
  image?: string
  imageAlt?: string
  canonical?: string
  draft?: boolean
}

export type ContentPage = PageFrontmatter & {
  slug: string
  component: Component
  path: string
}

const files = import.meta.glob('../../../content/pages/*/index.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const pageModules = import.meta.glob('../../../content/pages/*/index.md', {
  eager: true,
}) as Record<string, { default: Component }>

function slugFromPath(path: string) {
  return path.match(/\/content\/pages\/([^/]+)\/index\.md$/)?.[1] || ''
}

function pagePath(slug: string) {
  return slug === 'home' ? '/' : `/${slug}/`
}

export const pages = Object.entries(files)
  .map(([path, raw]) => {
    const parsed = parseFrontmatter(raw)
    const data = parsed.data as PageFrontmatter
    const slug = slugFromPath(path)

    return {
      ...data,
      slug,
      component: pageModules[path].default,
      path: pagePath(slug),
    }
  })
  .filter((page) => !page.draft)

export function getPage(slug: string) {
  return pages.find((page) => page.slug === slug)
}
