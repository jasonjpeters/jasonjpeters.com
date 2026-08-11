import type { Component } from 'vue'
import { parseFrontmatter } from './frontmatter'

export type PostFrontmatter = {
  title: string
  description?: string
  excerpt?: string
  date: string
  updated?: string
  type?: 'post' | 'graphic-art'
  tags?: string[]
  image?: string
  imageAlt?: string
  featuredImage?: string
  canonical?: string
  externalUrl?: string
  schemaType?: string
  draft?: boolean
}

export type Post = PostFrontmatter & {
  description: string
  image?: string
  slug: string
  component: Component
  path: string
}

const files = import.meta.glob('../../../content/posts/*/index.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const postModules = import.meta.glob('../../../content/posts/*/index.md', {
  eager: true,
}) as Record<string, { default: Component }>

const postAssets = import.meta.glob('../../../content/posts/*/*.{avif,gif,jpeg,jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function slugFromPath(path: string) {
  return path.match(/\/content\/posts\/([^/]+)\/index\.md$/)?.[1] || ''
}

function postPublicPath(slug: string, source?: string) {
  if (!source) {
    return undefined
  }

  if (/^(https?:)?\/\//.test(source) || source.startsWith('/')) {
    return source
  }

  const cleanSource = source.replace(/^\.\//, '')
  return postAssets[`../../../content/posts/${slug}/${cleanSource}`] || `/posts/${slug}/${cleanSource}`
}

export const posts = Object.entries(files)
  .map(([path, raw]) => {
    const parsed = parseFrontmatter(raw)
    const data = parsed.data as PostFrontmatter
    const slug = slugFromPath(path)

    return {
      ...data,
      description: data.description || data.excerpt || '',
      image: postPublicPath(slug, data.image || data.featuredImage),
      imageAlt: data.imageAlt || data.title,
      slug,
      component: postModules[path].default,
      path: `/posts/${slug}/`,
    }
  })
  .filter((post) => !post.draft)
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug)
}
