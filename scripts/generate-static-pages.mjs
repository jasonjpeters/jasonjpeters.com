import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'

const root = process.cwd()
const dist = path.join(root, 'dist')
const siteName = 'Jason Peters'
const siteUrl = normalizeOrigin(process.env.VITE_SITE_URL || 'https://jasonjpeters.com')
const googleGa4Id = process.env.GOOGLE_GA4_ID || ''
const defaultDescription =
  'Technical writing, web development notes, infrastructure experiments, and project work from Jason Peters.'
const author = {
  '@type': 'Person',
  name: 'Jason J. Peters',
  url: siteUrl,
}
const topics = [
  'web and software development',
  'PHP and JavaScript ecosystems',
  'Vue',
  'Laravel',
  'WordPress',
  'Linux',
  'systems administration',
  'infrastructure',
  'containers and virtualization',
  'technical experiments and projects',
]

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})

const defaultImageRenderer =
  markdown.renderer.rules.image ||
  ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))

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
        return {
          ...data,
          description: data.description || data.excerpt || '',
          image: postPublicPath(entry.name, data.image || data.featuredImage),
          imageAlt: data.imageAlt || data.title,
          slug: entry.name,
          content,
          contentText: textFromMarkdown(content),
          contentType: data.type || 'post',
          path: `/posts/${entry.name}/`,
          type: 'article',
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
  const image = route.image ? absoluteUrl(route.image) : undefined

  if (route.path === '/') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: author.name,
        url: siteUrl,
        description: 'Systems-minded web developer and graphic designer.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        description,
        url,
        author,
      },
    ]
  }

  if (route.contentType === 'graphic-art') {
    return {
      '@context': 'https://schema.org',
      '@type': route.schemaType || 'CreativeWork',
      name: title,
      description,
      url,
      datePublished: sitemapDate(route.date),
      dateModified: sitemapDate(route.updated || route.date),
      creator: author,
      author,
      sameAs: route.externalUrl,
      keywords: Array.isArray(route.tags) ? route.tags.join(', ') : undefined,
      image,
    }
  }

  if (route.type === 'article') {
    return {
      '@context': 'https://schema.org',
      '@type': route.schemaType || 'BlogPosting',
      headline: title,
      description,
      url,
      mainEntityOfPage: url,
      datePublished: sitemapDate(route.date),
      dateModified: sitemapDate(route.updated || route.date),
      author,
      publisher: author,
      keywords: Array.isArray(route.tags) ? route.tags.join(', ') : undefined,
      image,
    }
  }

  if (route.path === '/posts/') {
    return {
      '@context': 'https://schema.org',
      '@type': route.schemaType || 'Blog',
      name: title,
      description,
      url,
      author,
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': route.schemaType || 'WebPage',
    name: title,
    description,
    url,
    author,
    image,
  }
}

function renderHead(route) {
  const title = formatTitle(route)
  const description = route.description || defaultDescription
  const url = routeUrl(route)
  const image = route.image ? absoluteUrl(route.image) : undefined
  const schema = JSON.stringify(buildSchema(route), removeUndefined, 2).replaceAll('</script', '<\\/script')
  const robots = route.noindex ? '<meta name="robots" content="noindex" />' : ''
  const canonical = route.noindex ? '' : `<link rel="canonical" href="${escapeHtml(url)}" />`
  const imageTags = image
    ? `
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(route.imageAlt || route.title || siteName)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(route.imageAlt || route.title || siteName)}" />`
    : ''
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
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${route.type === 'article' ? 'article' : 'website'}" />
    <meta property="og:url" content="${escapeHtml(url)}" />${articleTags}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
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
      <div class="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4 px-5 py-5">
        <div class="terminal-prompt">
          <p><a href="/" class="terminal-prompt__host" aria-label="Home">jasonjpeters.com</a></p>
        </div>
        <nav class="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Primary navigation">
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

  if (route.type === 'article') {
    return renderPost(route)
  }

  if (route.path === '/404.html') {
    return renderNotFound()
  }

  return `<section class="prose-content mx-auto max-w-3xl">
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
    <p class="max-w-2xl text-muted-foreground">Markdown-authored updates, project notes, and writeups.</p>
  </section>
  <section class="mt-8">
    ${renderPostList(posts)}
  </section>`
}

function renderPostList(posts) {
  return `<div class="terminal-panel divide-y divide-border">
    ${posts
      .map(
        (post) => `<article class="px-4 py-5">
        <a href="${escapeHtml(post.path)}" class="group block">
          <div class="${post.image ? 'grid gap-4 md:grid-cols-[10rem_1fr]' : ''}">
            ${
              post.image
                ? `<img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt || post.title)}" class="terminal-image aspect-[4/3] w-full border border-border object-cover md:w-40" loading="lazy" decoding="async" />`
                : ''
            }
            <div>
              <p class="terminal-title text-xs uppercase text-muted-foreground">&gt; <time datetime="${escapeHtml(
                sitemapDate(post.date) || '',
              )}">${escapeHtml(formatHumanDate(post.date))}</time> | ${post.contentType === 'graphic-art' ? 'Graphic Art' : 'Post'}</p>
              <h2 class="terminal-title text-lg font-semibold uppercase tracking-normal group-hover:underline">${escapeHtml(
                post.title,
              )}</h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">${escapeHtml(
                post.description,
              )}</p>
              ${renderTagList(post.tags)}
            </div>
          </div>
        </a>
      </article>`,
      )
      .join('')}
  </div>`
}

function renderTagList(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return ''
  }

  return `<div class="mt-3 flex flex-wrap gap-2">
    ${tags
      .map(
        (tag) =>
          `<span class="border border-border bg-secondary px-2 py-1 text-xs uppercase text-secondary-foreground">${escapeHtml(
            tag,
          )}</span>`,
      )
      .join('')}
  </div>`
}

function renderPost(post) {
  return `<article class="${post.contentType === 'graphic-art' ? 'mx-auto max-w-4xl' : 'mx-auto max-w-3xl'}">
    <a href="/posts/" class="terminal-title text-sm uppercase text-muted-foreground hover:text-foreground">Back to posts</a>
    <header class="mt-8 border-b border-border pb-8 ${
      post.contentType === 'graphic-art' ? 'grid gap-6 md:grid-cols-[1fr_16rem]' : ''
    }">
      <div>
        <p class="text-sm uppercase text-muted-foreground">
          ${post.contentType === 'graphic-art' ? '<span>Graphic Art / </span>' : ''}<time datetime="${escapeHtml(
            sitemapDate(post.date) || '',
          )}">${escapeHtml(formatHumanDate(post.date))}</time>
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
    <div class="prose-content mt-8">${renderMarkdown(post.content, `/posts/${post.slug}/`)}</div>
  </article>`
}

function renderNotFound() {
  return `<section class="mx-auto max-w-2xl space-y-5 text-center">
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
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(routeUrl(post))}</link>
      <guid isPermaLink="true">${escapeXml(routeUrl(post))}</guid>
      ${pubDate ? `<pubDate>${escapeXml(pubDate)}</pubDate>` : ''}
      <description>${escapeXml(post.description || '')}</description>
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
  const pages = routes.filter((route) => route.type !== 'article' && !route.noindex)
  const posts = routes.filter((route) => route.type === 'article' && !route.noindex)
  const lines = [
    `# ${siteName}`,
    '',
    'Personal website and technical writing by Jason Peters.',
    '',
    'Primary topics include:',
    ...topics.map((topic) => `- ${topic}`),
    '',
    '## Sections',
    ...pages.map(
      (route) => `- [${route.title || siteName}](${routeUrl(route)}): ${route.description || defaultDescription}`,
    ),
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
    defaultDescription,
    '',
    '## Public Technical Content',
    '',
    ...posts.flatMap((post) => [
      `### ${post.title}`,
      '',
      `URL: ${routeUrl(post)}`,
      post.date ? `Published: ${sitemapDate(post.date)}` : '',
      post.tags?.length ? `Tags: ${post.tags.join(', ')}` : '',
      '',
      post.contentText,
      '',
    ]),
  ].filter(Boolean)

  await fs.writeFile(path.join(dist, 'llms-full.txt'), `${lines.join('\n')}\n`)
}

function validateRoutes(routes) {
  const canonicals = new Set()
  const outputs = new Set()

  for (const route of routes) {
    route.path = normalizePath(route.path)

    if (!route.title) {
      throw new Error(`Missing title for route ${route.path}`)
    }

    if (!route.description && route.path !== '/404.html') {
      console.warn(`Warning: missing description for ${route.path}`)
    }

    if (route.type === 'article' && !sitemapDate(route.date)) {
      throw new Error(`Missing or invalid date for post ${route.path}`)
    }

    const canonical = routeUrl(route)
    new URL(canonical)

    if (canonicals.has(canonical)) {
      throw new Error(`Duplicate canonical URL: ${canonical}`)
    }
    canonicals.add(canonical)

    const output = route.path === '/404.html' ? '/404.html' : `${route.path}index.html`
    if (outputs.has(output)) {
      throw new Error(`Duplicate generated output path: ${output}`)
    }
    outputs.add(output)
  }
}

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const posts = await readPosts()
const pages = await readPages()
const homePage = pages.find((page) => page.slug === 'home')
const routes = [
  {
    path: '/',
    title: 'Jason Peters',
    seoTitle: 'Jason Peters | Software, Web, and Systems Development',
    description: defaultDescription,
    ...(homePage || {}),
  },
  {
    path: '/posts/',
    title: 'Posts',
    description: 'Technical posts, project notes, and Markdown-authored writeups from Jason Peters.',
    type: 'website',
  },
  ...pages.filter((page) => page.slug !== 'home'),
  ...posts,
  {
    path: '/404.html',
    title: 'Page Not Found',
    description: 'The requested page could not be found.',
    noindex: true,
  },
]

validateRoutes(routes)

await Promise.all(routes.map((route) => writeRoute(template, route, posts)))
await copyPostAssets()
await writeRobotsTxt()
await writeSitemap(routes)
await writeFeed(posts)
await writeLlmsTxt(routes)
await writeLlmsFullTxt(routes)
