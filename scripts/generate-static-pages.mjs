import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const root = process.cwd()
const dist = path.join(root, 'dist')
const siteName = 'Jason Peters'
const siteUrl = process.env.VITE_SITE_URL || 'https://jasonjpeters.com'
const defaultDescription = 'Work, writing, and project notes from Jason Peters.'
const author = {
  '@type': 'Person',
  name: 'Jason J. Peters',
  url: siteUrl,
}

const escapeHtml = (value = '') =>
  value
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

async function readPosts() {
  const postsDir = path.join(root, 'content/posts')
  const entries = await fs.readdir(postsDir, { withFileTypes: true })
  const posts = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const postPath = path.join(postsDir, entry.name, 'index.md')
        const raw = await fs.readFile(postPath, 'utf8')
        const { data } = matter(raw)
        return {
          ...data,
          description: data.description || data.excerpt || '',
          image: postPublicPath(entry.name, data.image || data.featuredImage),
          slug: entry.name,
          type: data.type || 'post',
          path: `/posts/${entry.name}/`,
        }
      }),
  )

  return posts.filter((post) => !post.draft)
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
        const { data } = matter(raw)

        return {
          ...data,
          slug: entry.name,
          path: entry.name === 'home' ? '/' : `/${entry.name}/`,
        }
      }),
  )

  return pages.filter((page) => !page.draft)
}

function postPublicPath(slug, source) {
  if (!source) {
    return undefined
  }

  if (/^(https?:)?\/\//.test(source) || source.startsWith('/')) {
    return source
  }

  return `/posts/${slug}/${source.replace(/^\.\//, '')}`
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

function injectSeo(template, route) {
  const title = route.title ? `${route.title} | ${siteName}` : siteName
  const description = route.description || defaultDescription
  const url = new URL(route.path || '/404.html', siteUrl).toString()
  const image = route.image ? new URL(route.image, siteUrl).toString() : ''
  const schema = JSON.stringify(buildSchema(route), null, 2).replaceAll('</script', '<\\/script')
  const imageTags = image
    ? `
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />`
    : ''

  const tags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${route.type || 'website'}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />${imageTags}
    <script type="application/ld+json">${schema}</script>`

  return template.replace(/<title>.*?<\/title>/, tags)
}

function routeUrl(route) {
  return new URL(route.path || '/', siteUrl).toString()
}

function schemaDate(value) {
  return sitemapDate(value)
}

function buildSchema(route) {
  const url = routeUrl(route)
  const title = route.title || siteName
  const description = route.description || defaultDescription
  const image = route.image ? new URL(route.image, siteUrl).toString() : undefined

  if (route.contentType === 'graphic-art') {
    return {
      '@context': 'https://schema.org',
      '@type': route.schemaType || 'CreativeWork',
      name: title,
      description,
      url,
      datePublished: schemaDate(route.date),
      dateModified: schemaDate(route.updated || route.date),
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
      datePublished: schemaDate(route.date),
      dateModified: schemaDate(route.updated || route.date),
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

  if (route.path === '/') {
    return {
      '@context': 'https://schema.org',
      '@type': route.schemaType || 'WebSite',
      name: siteName,
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

function sitemapDate(value) {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return String(value).slice(0, 10)
}

async function writeRoute(template, route) {
  const routePath = route.path.replace(/^\/|\/$/g, '')
  const outputDir = routePath ? path.join(dist, routePath) : dist
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(path.join(outputDir, 'index.html'), injectSeo(template, route))
}

async function writeSitemap(routes) {
  const urls = routes
    .map((route) => {
      const lastmodDate = sitemapDate(route.date)
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

async function writeLlmsTxt(routes) {
  const pages = routes.filter((route) => route.type !== 'article')
  const posts = routes.filter((route) => route.type === 'article')
  const lines = [
    `# ${siteName}`,
    '',
    `> ${defaultDescription}`,
    '',
    '## Pages',
    ...pages.map((route) => `- [${route.title || siteName}](${routeUrl(route)}): ${route.description || defaultDescription}`),
    '',
    '## Posts',
    ...posts.map((route) => `- [${route.title}](${routeUrl(route)}): ${route.description || ''}`),
    '',
  ]

  await fs.writeFile(path.join(dist, 'llms.txt'), `${lines.join('\n')}\n`)
}

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const posts = await readPosts()
const pages = await readPages()
const homePage = pages.find((page) => page.slug === 'home')
const routes = [
  homePage || {
    path: '/',
    title: 'Portfolio and Posts',
    description: 'Work, project writeups, and technical notes from Jason Peters.',
  },
  {
    path: '/posts/',
    title: 'Posts',
    description: 'Markdown-authored project posts and technical notes from Jason Peters.',
  },
  ...pages.filter((page) => page.slug !== 'home'),
  ...posts.map((post) => ({
    path: post.path,
    title: post.title,
    description: post.description,
    image: post.image,
    date: post.date,
    updated: post.updated,
    tags: post.tags,
    externalUrl: post.externalUrl,
    schemaType: post.schemaType,
    contentType: post.type,
    type: 'article',
  })),
]

await Promise.all(routes.map((route) => writeRoute(template, route)))
await copyPostAssets()
await writeSitemap(routes)
await writeLlmsTxt(routes)
await fs.writeFile(
  path.join(dist, '404.html'),
  injectSeo(template, { path: '/404.html', title: 'Page Not Found' }),
)
