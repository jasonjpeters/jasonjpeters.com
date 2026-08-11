import type { Component } from 'vue'
import { parseFrontmatter } from './frontmatter'
import { extractMarkdownHeadings, type MarkdownHeading } from './metadata'
import { normalizedTopicsForTags } from '../topics'

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
  content: string
  headings: MarkdownHeading[]
  topicSlugs: string[]
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

function normalizeTagValue(tag: string) {
  return tag.trim().toLowerCase()
}

export const posts = Object.entries(files)
  .map(([path, raw]) => {
    const parsed = parseFrontmatter(raw)
    const data = parsed.data as PostFrontmatter
    const slug = slugFromPath(path)

    const normalizedTopics = normalizedTopicsForTags(data.tags)

    return {
      ...data,
      description: data.description || data.excerpt || '',
      image: postPublicPath(slug, data.image || data.featuredImage),
      imageAlt: data.imageAlt || data.title,
      slug,
      component: postModules[path].default,
      path: `/posts/${slug}/`,
      content: parsed.content,
      headings: extractMarkdownHeadings(parsed.content),
      topicSlugs: normalizedTopics.map((topic) => topic.slug),
    }
  })
  .filter((post) => !post.draft)
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug)
}

export function getPostTags(sourcePosts: Post[] = posts) {
  const tags = new Map<string, { name: string; count: number }>()

  for (const post of sourcePosts) {
    for (const tag of post.tags || []) {
      const key = normalizeTagValue(tag)
      const existing = tags.get(key)

      tags.set(key, {
        name: existing?.name || tag,
        count: (existing?.count || 0) + 1,
      })
    }
  }

  return [...tags.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function getPostsByTag(tag: string, sourcePosts: Post[] = posts) {
  const normalized = normalizeTagValue(tag)

  return sourcePosts.filter((post) =>
    (post.tags || []).some((postTag) => normalizeTagValue(postTag) === normalized),
  )
}

export function getRelatedPosts(post: Post, limit = 3) {
  const postTopicSlugs = new Set(post.topicSlugs)
  const postTagSlugs = new Set((post.tags || []).map((tag) => tag.toLowerCase()))

  return posts
    .filter((candidate) => candidate.slug !== post.slug && !candidate.draft)
    .map((candidate) => {
      const sharedTopics = candidate.topicSlugs.filter((topic) => postTopicSlugs.has(topic)).length
      const sharedTags = (candidate.tags || []).filter((tag) => postTagSlugs.has(tag.toLowerCase())).length

      return {
        post: candidate,
        score: sharedTopics * 2 + sharedTags,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.post.date) - Date.parse(a.post.date))
    .slice(0, limit)
    .map((candidate) => candidate.post)
}
