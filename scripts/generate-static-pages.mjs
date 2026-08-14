import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'

const root = process.cwd()
const dist = path.join(root, 'dist')
const siteConfig = JSON.parse(readFileSync(path.join(root, 'site.config.json'), 'utf8'))
const siteName = siteConfig.name
const siteUrl = normalizeOrigin(process.env.VITE_SITE_URL || siteConfig.url)
const googleGa4Id = process.env.GOOGLE_GA4_ID || ''
const defaultDescription = siteConfig.description
const defaultSocialImage = siteConfig.socialImage
const defaultSocialImageAlt = siteConfig.socialImageAlt
const personId = `${siteUrl}/#person`
const websiteId = `${siteUrl}/#website`
const authorReference = {
  '@type': 'Person',
  '@id': personId,
  name: siteConfig.author.name,
}
let eligibleTopics = []

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const defaultImageRenderer =
  markdown.renderer.rules.image ||
  ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))
const defaultHeadingRenderer =
  markdown.renderer.rules.heading_open ||
  ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))

markdown.renderer.rules.heading_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  const contentToken = tokens[index + 1]
  const headingIds = (env.headingIds ||= {})
  const base = slugifyHeading(contentToken?.content || '')

  if (base) {
    const count = headingIds[base] || 0
    headingIds[base] = count + 1
    token.attrSet('id', count ? `${base}-${count + 1}` : base)
  }

  return defaultHeadingRenderer(tokens, index, options, env, self)
}

markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index]
  const source = token.attrGet('src')
  const alt = token.content || token.attrGet('alt') || ''

  if (source && env?.basePath && !isAbsoluteAsset(source) && !source.startsWith('#')) {
    token.attrSet('src', `${env.basePath}${source.replace(/^\.\//, '')}`)
  }

  token.attrSet('alt', alt)
  token.attrSet('loading', 'lazy')
  token.attrSet('decoding', 'async')

  return defaultImageRenderer(tokens, index, options, env, self)
}

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const escapeXml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

function normalizeOrigin(value) {
  const url = new URL(value)
  return url.origin
}

function isAbsoluteAsset(value) {
  return /^(https?:)?\/\//.test(value) || value.startsWith('/')
}

function normalizePath(value = '/') {
  if (value === '/404.html') {
    return value
  }

  const clean = `/${String(value).replace(/^\/+|\/+$/g, '')}`
  return clean === '/' ? '/' : `${clean}/`
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugifyHeading(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function topicPath(slug) {
  return `/topics/${slug}/`
}

function topicLookup() {
  const lookup = new Map()

  for (const topic of siteConfig.topicDefinitions || []) {
    lookup.set(slugify(topic.slug), topic)
    lookup.set(slugify(topic.name), topic)

    for (const alias of topic.aliases || []) {
      lookup.set(slugify(alias), topic)
    }
  }

  return lookup
}

const topicMap = topicLookup()

function topicForTag(tag) {
  return topicMap.get(slugify(tag))
}

function normalizedTopicsForTags(tags = []) {
  const topics = new Map()

  for (const tag of tags || []) {
    const topic = topicForTag(tag)

    if (topic) {
      topics.set(topic.slug, topic)
    }
  }

  return [...topics.values()]
}

function buildTopicRoutes(posts) {
  const counts = new Map()
  const postsByTopic = new Map()

  for (const post of posts) {
    if (post.contentType === 'graphic-art') {
      continue
    }

    for (const topic of normalizedTopicsForTags(post.tags)) {
      counts.set(topic.slug, (counts.get(topic.slug) || 0) + 1)
      postsByTopic.set(topic.slug, [...(postsByTopic.get(topic.slug) || []), post])
    }
  }

  return (siteConfig.topicDefinitions || [])
    .map((topic) => ({
      ...topic,
      path: topicPath(topic.slug),
      title: `${topic.name} Articles`,
      description: topic.description,
      type: 'website',
      contentType: 'topic',
      posts: postsByTopic.get(topic.slug) || [],
      postCount: counts.get(topic.slug) || 0,
      breadcrumbs: [
        { label: 'Home', path: '/' },
        { label: 'Topics', path: '/topics/' },
        { label: topic.name },
      ],
    }))
    .filter((topic) => topic.postCount >= siteConfig.topicPageMinimumPosts)
}

function topicLinkForTag(tag) {
  const topic = topicForTag(tag)

  if (!topic || !eligibleTopics.some((eligible) => eligible.slug === topic.slug)) {
    return undefined
  }

  return {
    label: tag,
    name: topic.name,
    path: topicPath(topic.slug),
  }
}

function tagFilterPath(tag) {
  return `/posts/?tag=${encodeURIComponent(tag)}`
}

function linkForTag(tag) {
  return {
    label: tag,
    path: tagFilterPath(topicLinkForTag(tag)?.name || tag),
  }
}

function extractMarkdownHeadings(content) {
  const seen = new Map()
  const headings = []

  for (const line of String(content || '').split('\n')) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)

    if (!match) {
      continue
    }

    const text = match[2].replace(/\s+#+$/, '').trim()
    const base = slugifyHeading(text)

    if (!base) {
      continue
    }

    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    headings.push({
      id: count ? `${base}-${count + 1}` : base,
      text,
      level: match[1].length,
    })
  }

  return headings
}

function routeUrl(route) {
  const canonical = route.canonical || route.path || '/'
  return new URL(canonical, siteUrl).toString()
}

function absoluteUrl(value) {
  return new URL(value, siteUrl).toString()
}

function validGoogleGa4Id(value) {
  return /^G-[A-Z0-9]+$/.test(value)
}

function sitemapDate(value) {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  const text = String(value)
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : undefined
}

function formatHumanDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${sitemapDate(value)}T00:00:00Z`))
}

function formatRssDate(value) {
  const date = sitemapDate(value)
  return date ? new Date(`${date}T00:00:00Z`).toUTCString() : undefined
}

function formatTitle(route) {
  if (route.seoTitle) {
    return route.seoTitle
  }

  if (!route.title || route.path === '/') {
    return route.title || siteName
  }

  return route.title.includes(siteName) ? route.title : `${route.title} | ${siteName}`
}

function postPublicPath(slug, source) {
  if (!source) {
    return undefined
  }

  if (isAbsoluteAsset(source)) {
    return source
  }

  return `/posts/${slug}/${source.replace(/^\.\//, '')}`
}

async function postAssetExists(slug, source) {
  if (!source || isAbsoluteAsset(source)) {
    return true
  }

  try {
    await fs.access(path.join(root, 'content/posts', slug, source.replace(/^\.\//, '')))
    return true
  } catch {
    return false
  }
}

function renderMarkdown(content, basePath = '/') {
  return markdown.render(content || '', { basePath })
}

function textFromMarkdown(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function llmsTextFromMarkdown(content) {
  return String(content || '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function readPosts() {
  const postsDir = path.join(root, 'content/posts')
  const entries = await fs.readdir(postsDir, { withFileTypes: true })
  const posts = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const postPath = path.join(postsDir, entry.name, 'index.md')
        const raw = await fs.readFile(postPath, 'utf8')
        const { data, content } = matter(raw)
        const explicitImage = data.image || data.featuredImage
        const imageExists = await postAssetExists(entry.name, explicitImage)
        const image = explicitImage && imageExists ? postPublicPath(entry.name, explicitImage) : undefined

        if (explicitImage && !imageExists) {
          console.warn(`Warning: missing image for post /posts/${entry.name}/: ${explicitImage}; using default social image`)
        }

        const normalizedTopics = normalizedTopicsForTags(data.tags || [])
        return {
          ...data,
          description: data.description || data.excerpt || '',
          image,
          imageAlt: data.imageAlt || data.title,
          slug: entry.name,
          content,
          contentText: textFromMarkdown(content),
          llmsText: llmsTextFromMarkdown(content),
          headings: extractMarkdownHeadings(content),
          topicSlugs: normalizedTopics.map((topic) => topic.slug),
          contentType: data.type || 'post',
          path: `/posts/${entry.name}/`,
          type: 'article',
          breadcrumbs: [
            { label: 'Home', path: '/' },
            { label: 'Posts', path: '/posts/' },
            { label: data.title || entry.name },
          ],
        }
      }),
  )

  return posts.filter((post) => !post.draft).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

async function readPages() {
  const pagesDir = path.join(root, 'content/pages')
  const entries = await fs.readdir(pagesDir, { withFileTypes: true })
  const pages = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const pagePath = path.join(pagesDir, entry.name, 'index.md')
        const raw = await fs.readFile(pagePath, 'utf8')
        const { data, content } = matter(raw)

        return {
          ...data,
          slug: entry.name,
          content,
          contentText: textFromMarkdown(content),
          path: entry.name === 'home' ? '/' : `/${entry.name}/`,
          type: 'website',
        }
      }),
  )

  return pages.filter((page) => !page.draft)
}

async function copyPostAssets() {
  const postsDir = path.join(root, 'content/posts')
  const entries = await fs.readdir(postsDir, { withFileTypes: true })

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const sourceDir = path.join(postsDir, entry.name)
        const outputDir = path.join(dist, 'posts', entry.name)
        const files = await fs.readdir(sourceDir, { withFileTypes: true })

        await Promise.all(
          files
            .filter((file) => file.isFile() && file.name !== 'index.md')
            .map(async (file) => {
              await fs.mkdir(outputDir, { recursive: true })
              await fs.copyFile(path.join(sourceDir, file.name), path.join(outputDir, file.name))
            }),
        )
      }),
  )
}

function buildSchema(route) {
  const url = routeUrl(route)
  const title = route.title || siteName
  const description = route.description || defaultDescription
  const image = absoluteUrl(route.image || defaultSocialImage)
  const schemas = []

  if (route.path === '/') {
    schemas.push(
      {
        '@type': 'Person',
        '@id': personId,
        name: siteConfig.author.name,
        alternateName: siteConfig.author.displayName,
        url: siteUrl,
        description: siteConfig.author.description,
        jobTitle: siteConfig.author.jobTitle,
        sameAs: siteConfig.author.sameAs?.length ? siteConfig.author.sameAs : undefined,
        knowsAbout: siteConfig.topics,
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: siteConfig.siteName,
        alternateName: siteName,
        description,
        url: siteUrl,
        creator: authorReference,
        publisher: authorReference,
      },
    )
  }

  if (route.breadcrumbs?.length) {
    schemas.push({
      '@type': 'BreadcrumbList',
      itemListElement: route.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.path ? absoluteUrl(item.path) : undefined,
      })),
    })
  }

  if (route.contentType === 'graphic-art') {
    schemas.push({
      '@type': route.schemaType || 'CreativeWork',
      name: title,
      description,
      url,
      datePublished: sitemapDate(route.date),
      dateModified: sitemapDate(route.updated || route.date),
      creator: authorReference,
      author: authorReference,
      sameAs: route.externalUrl,
      keywords: Array.isArray(route.tags) ? route.tags.join(', ') : undefined,
      image,
    })
    return { '@context': 'https://schema.org', '@graph': schemas }
  }

  if (route.type === 'article') {
    schemas.push({
      '@type': route.schemaType || 'BlogPosting',
      headline: title,
      description,
      url,
      mainEntityOfPage: url,
      datePublished: sitemapDate(route.date),
      dateModified: sitemapDate(route.updated || route.date),
      author: authorReference,
      publisher: authorReference,
      keywords: Array.isArray(route.tags) ? route.tags.join(', ') : undefined,
      image,
    })
    return { '@context': 'https://schema.org', '@graph': schemas }
  }

  if (route.contentType === 'topic') {
    schemas.push({
      '@type': 'CollectionPage',
      name: title,
      description,
      url,
      about: route.name,
      isPartOf: { '@id': websiteId },
      creator: authorReference,
      hasPart: route.posts.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        url: routeUrl(post),
      })),
    })
    return { '@context': 'https://schema.org', '@graph': schemas }
  }

  if (route.path === '/posts/') {
    schemas.push({
      '@type': route.schemaType || 'Blog',
      name: title,
      description,
      url,
      author: authorReference,
      isPartOf: { '@id': websiteId },
    })
    return { '@context': 'https://schema.org', '@graph': schemas }
  }

  schemas.push({
    '@type': route.schemaType || 'WebPage',
    name: title,
    description,
    url,
    author: authorReference,
    isPartOf: { '@id': websiteId },
    image,
  })

  return { '@context': 'https://schema.org', '@graph': schemas }
}

function renderHead(route) {
  const title = formatTitle(route)
  const description = route.description || defaultDescription
  const url = routeUrl(route)
  const image = absoluteUrl(route.image || defaultSocialImage)
  const schema = JSON.stringify(buildSchema(route), removeUndefined, 2).replaceAll('</script', '<\\/script')
  const robots = route.noindex ? '<meta name="robots" content="noindex" />' : ''
  const canonical = route.noindex ? '' : `<link rel="canonical" href="${escapeHtml(url)}" />`
  const imageTags = `
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(route.imageAlt || (route.image ? route.title : defaultSocialImageAlt) || siteName)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(route.imageAlt || (route.image ? route.title : defaultSocialImageAlt) || siteName)}" />`
  const articleTags =
    route.type === 'article'
      ? `
    <meta property="article:published_time" content="${escapeHtml(sitemapDate(route.date) || '')}" />
    <meta property="article:modified_time" content="${escapeHtml(sitemapDate(route.updated || route.date) || '')}" />${(route.tags || [])
      .map((tag) => `
    <meta property="article:tag" content="${escapeHtml(tag)}" />`)
      .join('')}`
      : ''
  const analytics = renderAnalyticsTags()

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${robots}
    ${canonical}
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteName)} Feed" href="/feed.xml" />
    <meta property="og:site_name" content="${escapeHtml(siteConfig.siteName || siteName)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${route.type === 'article' ? 'article' : 'website'}" />
    <meta property="og:url" content="${escapeHtml(url)}" />${articleTags}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />${imageTags}
    <script type="application/ld+json">${schema}</script>${analytics}`
}

function renderAnalyticsTags() {
  if (!googleGa4Id) {
    return ''
  }

  if (!validGoogleGa4Id(googleGa4Id)) {
    throw new Error(`Invalid GOOGLE_GA4_ID value: ${googleGa4Id}`)
  }

  const id = escapeHtml(googleGa4Id)

  return `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      window.__GA_MEASUREMENT_ID__ = "${id}";
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', "${id}");
    </script>`
}

function removeUndefined(_key, value) {
  return value === undefined || value === '' ? undefined : value
}

function renderShell(route, posts) {
  const year = new Date().getFullYear()

  return `<div class="terminal-shell flex min-h-svh flex-col bg-background text-foreground">
    <header class="border-b border-border bg-card/60">
      <div class="mx-auto flex max-w-5xl items-start justify-between gap-4 px-5 py-5">
        <div class="terminal-prompt">
          <p><a href="/" class="terminal-prompt__host" aria-label="Home">jasonjpeters.com</a></p>
        </div>
        <nav class="shrink-0 flex items-center gap-1 text-sm text-muted-foreground" aria-label="Primary navigation">
          <a class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3" href="/posts/">Posts</a>
          <a class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3" href="/about/">About</a>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:py-14">
      ${renderRouteContent(route, posts)}
    </main>
    <footer class="border-t border-border bg-card/60">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs uppercase text-muted-foreground">
        <p>&copy; ${year} Jason J. Peters. All rights reserved.</p>
      </div>
    </footer>
  </div>`
}

function renderRouteContent(route, posts) {
  if (route.path === '/') {
    return renderHome(route, posts)
  }

  if (route.path === '/posts/') {
    return renderPostsIndex(posts)
  }

  if (route.path === '/topics/') {
    return renderTopicsIndex()
  }

  if (route.contentType === 'topic') {
    return renderTopic(route)
  }

  if (route.type === 'article') {
    return renderPost(route, posts)
  }

  if (route.path === '/404.html') {
    return renderNotFound()
  }

  return `<section class="prose-content">
    ${renderMarkdown(route.content, route.path)}
  </section>`
}

function renderHome(route, posts) {
  return `<section>
    <div class="space-y-6">
      ${
        route.eyebrow
          ? `<p class="terminal-title text-sm font-medium uppercase tracking-normal text-muted-foreground">${escapeHtml(route.eyebrow)}</p>`
          : ''
      }
      <h1 class="max-w-3xl text-3xl font-semibold uppercase tracking-normal text-foreground sm:text-5xl">${escapeHtml(
        route.heroTitle || route.title || siteName,
      )}</h1>
      <p class="max-w-2xl text-lg leading-8 text-muted-foreground">${escapeHtml(
        route.description || defaultDescription,
      )}</p>
      <p class="max-w-3xl leading-7 text-muted-foreground">${escapeHtml(siteConfig.homepageIntro)}</p>
      <div class="prose-content">${renderMarkdown(route.content, '/')}</div>
    </div>
  </section>
  <section class="mt-14">
    <div class="mb-6 flex items-center justify-between gap-4">
      <h2 class="terminal-title text-xl font-semibold uppercase tracking-normal">Latest Posts</h2>
      <a class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3" href="/posts/">View all</a>
    </div>
    ${renderPostList(posts.slice(0, 4))}
  </section>`
}

function renderPostsIndex(posts) {
  return `<section class="space-y-3">
    <h1 class="terminal-title text-3xl font-semibold uppercase tracking-normal">Posts</h1>
    <p class="max-w-2xl text-muted-foreground">Technical writing, project notes, graphic work, and practical writeups.</p>
  </section>
  <section class="mt-8" aria-labelledby="post-filters">
    <label id="post-filters" class="terminal-title block text-sm font-semibold uppercase tracking-normal" for="tag-filter">Filter</label>
    <select id="tag-filter" class="mt-3 w-full max-w-xs border border-border bg-background px-3 py-2 text-sm uppercase text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <option value="">All posts</option>
      ${postTagCounts(posts)
        .map(
          (tag) =>
            `<option value="${escapeHtml(tag.name)}">${escapeHtml(
              tag.name,
            )} (${tag.count})</option>`,
        )
        .join('')}
    </select>
  </section>
  <section class="mt-8">
    ${renderPostList(posts)}
  </section>`
}

function postTagCounts(posts) {
  const tags = new Map()

  for (const post of posts) {
    for (const tag of post.tags || []) {
      const key = tag.trim().toLowerCase()
      const existing = tags.get(key)

      tags.set(key, {
        name: existing?.name || tag,
        count: (existing?.count || 0) + 1,
      })
    }
  }

  return [...tags.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function renderTopicsIndex() {
  return `<section class="space-y-3">
    <h1 class="terminal-title text-3xl font-semibold uppercase tracking-normal">Topics</h1>
    <p class="max-w-2xl text-muted-foreground">Technical subjects with enough published writing to work as focused entry points.</p>
  </section>
  <section class="mt-8">
    <div class="terminal-panel divide-y divide-border">
      ${eligibleTopics
        .map(
          (topic) => `<article class="px-4 py-5">
        <a href="${escapeHtml(topic.path)}" class="group block">
          <p class="terminal-title text-xs uppercase text-muted-foreground">${topic.postCount} ${
            topic.postCount === 1 ? 'article' : 'articles'
          }</p>
          <h2 class="terminal-title text-lg font-semibold uppercase tracking-normal group-hover:underline">${escapeHtml(
            topic.name,
          )}</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">${escapeHtml(topic.description)}</p>
        </a>
      </article>`,
        )
        .join('')}
    </div>
  </section>`
}

function renderTopic(topic) {
  return `<section>
    ${renderBreadcrumbs(topic.breadcrumbs)}
    <header class="space-y-4 border-b border-border pb-8">
      <p class="terminal-title text-sm font-medium uppercase tracking-normal text-muted-foreground">Topic</p>
      <h1 class="text-3xl font-semibold uppercase tracking-normal sm:text-5xl">${escapeHtml(topic.name)}</h1>
      <p class="text-lg leading-8 text-muted-foreground">${escapeHtml(topic.description)}</p>
    </header>
    <section class="mt-8" aria-labelledby="topic-articles">
      <h2 id="topic-articles" class="terminal-title mb-4 text-xl font-semibold uppercase tracking-normal">Articles</h2>
      ${renderPostList(topic.posts)}
    </section>
  </section>`
}

function renderPostList(posts) {
  return `<div class="terminal-panel divide-y divide-border">
    ${posts
      .map(
        (post) => `<article class="group px-4 py-5">
        <div class="${post.image ? 'grid gap-4 md:grid-cols-[10rem_1fr]' : ''}">
            ${
              post.image
                ? `<a href="${escapeHtml(post.path)}" class="block"><img src="${escapeHtml(
                    post.image,
                  )}" alt="${escapeHtml(
                    post.imageAlt || post.title,
                  )}" class="terminal-image aspect-[4/3] w-full border border-border object-cover md:w-40" loading="lazy" decoding="async" /></a>`
                : ''
            }
            <div>
              <p class="terminal-title text-xs uppercase text-muted-foreground">&gt; <time datetime="${escapeHtml(
                sitemapDate(post.date) || '',
              )}">${escapeHtml(formatHumanDate(post.date))}</time> | ${escapeHtml(postTypeLabel(post))}</p>
              <h2 class="terminal-title text-lg font-semibold uppercase tracking-normal"><a href="${escapeHtml(
                post.path,
              )}" class="hover:underline">${escapeHtml(post.title)}</a></h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">${escapeHtml(
                post.description,
              )}</p>
              ${renderTagList(post.tags)}
            </div>
          </div>
      </article>`,
      )
      .join('')}
  </div>`
}

function postTypeLabel(post) {
  return post.contentType === 'graphic-art' ? 'Graphic Art' : 'Development'
}

function renderTagList(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return ''
  }

  return `<div class="mt-3 flex flex-wrap gap-2">
    ${tags
      .map(
        (tag) =>
          renderTag(tag),
      )
      .join('')}
  </div>`
}

function renderTag(tag) {
  const link = linkForTag(tag)

  return `<a href="${escapeHtml(
    link.path,
  )}" class="border border-border bg-secondary px-2 py-1 text-xs uppercase text-secondary-foreground hover:bg-accent hover:text-accent-foreground">${escapeHtml(
    link.label,
  )}</a>`
}

function renderBreadcrumbs(items = []) {
  if (!items.length) {
    return ''
  }

  return `<nav class="mb-8 text-xs uppercase text-muted-foreground" aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-2">
      ${items
        .map((item, index) => {
          const separator = index < items.length - 1 ? '<span aria-hidden="true">/</span>' : ''
          const label =
            item.path && index < items.length - 1
              ? `<a href="${escapeHtml(item.path)}" class="hover:text-foreground">${escapeHtml(item.label)}</a>`
              : `<span aria-current="page">${escapeHtml(item.label)}</span>`

          return `<li class="flex items-center gap-2">${label}${separator}</li>`
        })
        .join('')}
    </ol>
  </nav>`
}

function renderToc(post) {
  if (!post.headings || post.headings.length < 3) {
    return ''
  }

  return `<nav class="terminal-panel mt-8 p-4 text-sm" aria-labelledby="table-of-contents">
    <h2 id="table-of-contents" class="terminal-title text-sm font-semibold uppercase tracking-normal">Contents</h2>
    <ol class="mt-3 space-y-2 text-muted-foreground">
      ${post.headings
        .map(
          (heading) =>
            `<li class="${heading.level === 3 ? 'pl-4' : ''}"><a href="#${escapeHtml(
              heading.id,
            )}" class="hover:text-foreground">${escapeHtml(heading.text)}</a></li>`,
        )
        .join('')}
    </ol>
  </nav>`
}

function relatedPostsFor(post, posts, limit = 3) {
  const topicSlugs = new Set(post.topicSlugs || [])
  const tagSlugs = new Set((post.tags || []).map((tag) => slugify(tag)))

  return posts
    .filter((candidate) => candidate.slug !== post.slug && !candidate.draft)
    .map((candidate) => {
      const sharedTopics = (candidate.topicSlugs || []).filter((topic) => topicSlugs.has(topic)).length
      const sharedTags = (candidate.tags || []).filter((tag) => tagSlugs.has(slugify(tag))).length

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

function renderRelatedPosts(post, posts) {
  const related = relatedPostsFor(post, posts)

  if (!related.length) {
    return ''
  }

  return `<section class="mt-12 border-t border-border pt-8" aria-labelledby="related-articles">
    <h2 id="related-articles" class="terminal-title mb-4 text-xl font-semibold uppercase tracking-normal">Related Articles</h2>
    ${renderPostList(related)}
  </section>`
}

function renderPost(post, posts) {
  return `<article>
    ${renderBreadcrumbs(post.breadcrumbs)}
    <header class="mt-8 border-b border-border pb-8 ${
      post.contentType === 'graphic-art' ? 'grid gap-6 md:grid-cols-[1fr_16rem]' : ''
    }">
      <div>
        <p class="text-sm uppercase text-muted-foreground">
          <span>${escapeHtml(postTypeLabel(post))} / </span>Published <time datetime="${escapeHtml(
            sitemapDate(post.date) || '',
          )}">${escapeHtml(formatHumanDate(post.date))}</time>${
            post.updated
              ? ` / Updated <time datetime="${escapeHtml(sitemapDate(post.updated) || '')}">${escapeHtml(
                  formatHumanDate(post.updated),
                )}</time>`
              : ''
          }
        </p>
        <h1 class="mt-3 text-3xl font-semibold uppercase tracking-normal sm:text-5xl">${escapeHtml(post.title)}</h1>
        <p class="mt-4 text-lg leading-8 text-muted-foreground">${escapeHtml(post.description)}</p>
        ${renderTagList(post.tags)}
      </div>
      ${
        post.contentType === 'graphic-art' && post.externalUrl
          ? `<aside class="terminal-panel h-fit p-4 text-sm"><a href="${escapeHtml(
              post.externalUrl,
            )}" target="_blank" rel="noreferrer" class="inline-flex w-full items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">View Original</a></aside>`
          : ''
      }
    </header>
    ${
      post.image
        ? `<figure class="mt-8"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(
            post.imageAlt || post.title,
          )}" class="terminal-image w-full border border-border object-cover" decoding="async" /></figure>`
        : ''
    }
    ${renderToc(post)}
    <div class="prose-content mt-8">${renderMarkdown(post.content, `/posts/${post.slug}/`)}</div>
    ${renderRelatedPosts(post, posts)}
  </article>`
}

function renderNotFound() {
  return `<section class="space-y-5 text-center">
    <h1 class="text-4xl font-semibold tracking-normal">Page not found</h1>
    <p class="text-muted-foreground">The page may have moved, or the URL may not match a published post.</p>
    <a href="/" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">Go home</a>
  </section>`
}

function injectStaticHtml(template, route, posts) {
  const head = renderHead(route)
  const body = renderShell(route, posts)

  return stripFallbackSeo(template)
    .replace('</head>', `${head}\n  </head>`)
    .replace(/<div id="app"><\/div>/, `<div id="app">${body}</div>`)
}

function stripFallbackSeo(template) {
  return template
    .replace(/\s*<title>.*?<\/title>/s, '')
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/g, '')
    .replace(/\s*<link\s+rel="canonical"[\s\S]*?\/>/g, '')
    .replace(/\s*<link\s+rel="alternate"[\s\S]*?application\/rss\+xml[\s\S]*?\/>/g, '')
}

async function writeRoute(template, route, posts) {
  const routePath = route.path === '/404.html' ? '404.html' : route.path.replace(/^\/|\/$/g, '')
  const outputDir = routePath && routePath !== '404.html' ? path.join(dist, routePath) : dist
  const outputFile = routePath === '404.html' ? path.join(dist, '404.html') : path.join(outputDir, 'index.html')

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(outputFile, injectStaticHtml(template, route, posts))
}

async function writeRobotsTxt() {
  await fs.writeFile(
    path.join(dist, 'robots.txt'),
    `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`,
  )
}

async function writeSitemap(routes) {
  const urls = routes
    .filter((route) => !route.noindex && route.path !== '/404.html')
    .map((route) => {
      const lastmodDate = sitemapDate(route.updated || route.date)
      const lastmod = lastmodDate
        ? `
    <lastmod>${escapeXml(lastmodDate)}</lastmod>`
        : ''

      return `  <url>
    <loc>${escapeXml(routeUrl(route))}</loc>${lastmod}
  </url>`
    })
    .join('\n')

  await fs.writeFile(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
  )
}

async function writeFeed(posts) {
  const items = posts
    .filter((post) => post.type === 'article')
    .map((post) => {
      const pubDate = formatRssDate(post.date)
      const categories = (post.tags || [])
        .map((tag) => `
      <category>${escapeXml(tag)}</category>`)
        .join('')
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(routeUrl(post))}</link>
      <guid isPermaLink="true">${escapeXml(routeUrl(post))}</guid>
      ${pubDate ? `<pubDate>${escapeXml(pubDate)}</pubDate>` : ''}
      <description>${escapeXml(post.description || '')}</description>${categories}
    </item>`
    })
    .join('\n')

  await fs.writeFile(
    path.join(dist, 'feed.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(siteUrl)}/</link>
    <description>${escapeXml(defaultDescription)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`,
  )
}

async function writeLlmsTxt(routes) {
  const pages = routes.filter((route) => route.type !== 'article' && route.contentType !== 'topic' && !route.noindex)
  const posts = routes.filter((route) => route.type === 'article' && !route.noindex)
  const lines = [
    `# ${siteName}`,
    '',
    siteConfig.homepageIntro,
    '',
    '## Main Sections',
    ...pages.map(
      (route) => `- [${route.title || siteName}](${routeUrl(route)}): ${route.description || defaultDescription}`,
    ),
    '',
    '## Topics',
    ...(eligibleTopics.length
      ? eligibleTopics.map((topic) => `- [${topic.name}](${routeUrl(topic)}): ${topic.description}`)
      : ['No topic pages are currently generated because topics must meet the configured publication threshold.']),
    '',
    '## Posts',
    ...posts.map((route) => `- [${route.title}](${routeUrl(route)}): ${route.description || ''}`),
    '',
  ]

  await fs.writeFile(path.join(dist, 'llms.txt'), `${lines.join('\n')}\n`)
}

async function writeLlmsFullTxt(routes) {
  const posts = routes.filter((route) => route.type === 'article' && !route.noindex)
  const lines = [
    `# ${siteName}`,
    '',
    siteConfig.homepageIntro,
    '',
    '## Topics',
    '',
    ...eligibleTopics.flatMap((topic) => [`### ${topic.name}`, '', `URL: ${routeUrl(topic)}`, topic.description, '']),
    '',
    '## Public Technical Content',
    '',
    ...posts.flatMap((post) => [
      `### ${post.title}`,
      '',
      `URL: ${routeUrl(post)}`,
      `Description: ${post.description || ''}`,
      post.date ? `Published: ${sitemapDate(post.date)}` : '',
      post.updated ? `Updated: ${sitemapDate(post.updated)}` : '',
      post.tags?.length ? `Tags: ${post.tags.join(', ')}` : '',
      post.topicSlugs?.length ? `Topics: ${post.topicSlugs.join(', ')}` : '',
      '',
      post.llmsText,
      '',
    ]),
  ].filter(Boolean)

  await fs.writeFile(path.join(dist, 'llms-full.txt'), `${lines.join('\n')}\n`)
}

function validateRoutes(routes) {
  const canonicals = new Set()
  const outputs = new Set()
  const descriptions = new Map()

  for (const route of routes) {
    route.path = normalizePath(route.path)

    if (!route.title) {
      throw new Error(`Missing title for route ${route.path}`)
    }

    if (!route.description && route.path !== '/404.html') {
      console.warn(`Warning: missing description for ${route.path}`)
    }

    if (route.title && String(route.title).length < 5) {
      console.warn(`Warning: very short title for ${route.path}`)
    }

    if (route.title && String(route.title).length > 90) {
      console.warn(`Warning: long title for ${route.path}`)
    }

    if (route.description && String(route.description).length < 40 && route.path !== '/404.html') {
      console.warn(`Warning: very short description for ${route.path}`)
    }

    if (route.description && String(route.description).length > 220) {
      console.warn(`Warning: long description for ${route.path}`)
    }

    if (route.description) {
      const descriptionKey = route.description.trim().toLowerCase()
      const existing = descriptions.get(descriptionKey)

      if (existing && route.type === 'article' && existing.type === 'article') {
        console.warn(`Warning: duplicate article description for ${route.path} and ${existing.path}`)
      }

      descriptions.set(descriptionKey, route)
    }

    if (route.type === 'article') {
      if (!route.title) {
        throw new Error(`Missing title for post ${route.path}`)
      }

      if (!route.description) {
        console.warn(`Warning: missing description for post ${route.path}`)
      }

      if (!sitemapDate(route.date)) {
        throw new Error(`Missing or invalid date for post ${route.path}`)
      }

      if (route.updated && !sitemapDate(route.updated)) {
        throw new Error(`Invalid updated date for post ${route.path}`)
      }

      if (route.updated && Date.parse(route.updated) < Date.parse(route.date)) {
        throw new Error(`Updated date is before publication date for post ${route.path}`)
      }

      if ((route.image || route.featuredImage) && !route.imageAlt) {
        console.warn(`Warning: missing imageAlt for custom image on ${route.path}`)
      }
    }

    const canonical = routeUrl(route)
    new URL(canonical)

    if (route.canonical && !route.canonical.startsWith('/') && !route.canonical.startsWith(siteUrl)) {
      throw new Error(`Invalid canonical override for ${route.path}: ${route.canonical}`)
    }

    if (canonicals.has(canonical)) {
      throw new Error(`Duplicate canonical URL: ${canonical}`)
    }
    canonicals.add(canonical)

    const output = route.path === '/404.html' ? '/404.html' : `${route.path}index.html`
    if (outputs.has(output)) {
      throw new Error(`Duplicate generated output path: ${output}`)
    }
    outputs.add(output)

    JSON.parse(JSON.stringify(buildSchema(route), removeUndefined))
  }
}

function validateTopics() {
  const slugs = new Set()
  const aliases = new Map()

  for (const topic of siteConfig.topicDefinitions || []) {
    const slug = slugify(topic.slug)

    if (slugs.has(slug)) {
      throw new Error(`Duplicate topic slug: ${topic.slug}`)
    }

    slugs.add(slug)

    for (const value of [topic.slug, topic.name, ...(topic.aliases || [])]) {
      const alias = slugify(value)
      const existing = aliases.get(alias)

      if (existing && existing !== topic.slug) {
        throw new Error(`Topic alias collision: ${value} maps to ${existing} and ${topic.slug}`)
      }

      aliases.set(alias, topic.slug)
    }
  }
}

async function validateGeneratedLinks() {
  const files = await findFiles(dist, '.html')
  const missing = []

  for (const file of files) {
    const html = await fs.readFile(file, 'utf8')
    const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1])

    for (const ref of refs) {
      if (
        ref.startsWith('http://') ||
        ref.startsWith('https://') ||
        ref.startsWith('mailto:') ||
        ref.startsWith('tel:') ||
        ref.startsWith('#') ||
        ref.startsWith('data:')
      ) {
        continue
      }

      const [pathnameWithQuery, fragment] = ref.split('#')
      const [pathname] = pathnameWithQuery.split('?')

      if (!pathname || !pathname.startsWith('/')) {
        continue
      }

      const target = pathname.endsWith('/')
        ? path.join(dist, pathname, 'index.html')
        : pathname.includes('.') && !pathname.endsWith('/index.html')
          ? path.join(dist, pathname)
          : path.join(dist, pathname, 'index.html')

      try {
        await fs.access(target)
      } catch {
        missing.push(`${path.relative(root, file)} -> ${ref}`)
        continue
      }

      if (fragment) {
        const targetHtml = await fs.readFile(target, 'utf8').catch(() => '')
        const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        if (!new RegExp(`id=["']${escaped}["']`).test(targetHtml)) {
          missing.push(`${path.relative(root, file)} -> missing fragment ${ref}`)
        }
      }
    }
  }

  if (missing.length) {
    throw new Error(`Broken generated internal links:\n${missing.join('\n')}`)
  }
}

async function findFiles(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return findFiles(fullPath, extension)
      }

      return entry.isFile() && entry.name.endsWith(extension) ? [fullPath] : []
    }),
  )

  return files.flat()
}

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const posts = await readPosts()
const pages = await readPages()
eligibleTopics = buildTopicRoutes(posts)
const homePage = pages.find((page) => page.slug === 'home')
const routes = [
  {
    path: '/',
    title: 'Jason Peters',
    seoTitle: siteConfig.title,
    description: defaultDescription,
    ...(homePage || {}),
  },
  {
    path: '/posts/',
    title: 'Posts',
    description: 'Technical posts, project notes, graphic work, and practical writeups.',
    type: 'website',
  },
  {
    path: '/topics/',
    title: 'Topics',
    description: 'Focused technical topic pages for published articles and development notes.',
    type: 'website',
    noindex: eligibleTopics.length === 0,
  },
  ...eligibleTopics,
  ...pages.filter((page) => page.slug !== 'home'),
  ...posts,
  {
    path: '/404.html',
    title: 'Page Not Found',
    description: 'The requested page could not be found.',
    noindex: true,
  },
]

validateTopics()
validateRoutes(routes)

await Promise.all(routes.map((route) => writeRoute(template, route, posts)))
await copyPostAssets()
await writeRobotsTxt()
await writeSitemap(routes)
await writeFeed(posts)
await writeLlmsTxt(routes)
await writeLlmsFullTxt(routes)
await validateGeneratedLinks()
