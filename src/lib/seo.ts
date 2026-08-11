import { watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { defaultDescription, defaultSocialImage, defaultSocialImageAlt, siteName, siteUrl } from './site'

export type SeoPageType = 'website' | 'article'

export interface SeoMetadata {
  title?: string
  description?: string
  path?: string
  canonical?: string
  image?: string
  imageAlt?: string
  type?: SeoPageType
  publishedAt?: string
  modifiedAt?: string
  tags?: string[]
  noindex?: boolean
}

type ReactiveSeoMetadata = {
  [Key in keyof SeoMetadata]?: MaybeRefOrGetter<SeoMetadata[Key]>
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    document.head.append(element)
  }

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.append(element)
  }

  element.href = href
}

function removeCanonical() {
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove()
}

function upsertFeedLink() {
  let element = document.head.querySelector<HTMLLinkElement>('link[type="application/rss+xml"]')

  if (!element) {
    element = document.createElement('link')
    element.rel = 'alternate'
    element.type = 'application/rss+xml'
    document.head.append(element)
  }

  element.title = `${siteName} Feed`
  element.href = '/feed.xml'
}

function removeElement(selector: string) {
  document.head.querySelector(selector)?.remove()
}

function normalizePath(path = '/') {
  if (path === '/404.html') {
    return path
  }

  const clean = `/${path.replace(/^\/+|\/+$/g, '')}`
  return clean === '/' ? '/' : `${clean}/`
}

function formatTitle(title?: string) {
  if (!title) {
    return siteName
  }

  return title.includes(siteName) ? title : `${title} | ${siteName}`
}

export function useSeo(input: ReactiveSeoMetadata = {}) {
  watchEffect(() => {
    const rawTitle = toValue(input.title)
    const title = formatTitle(rawTitle)
    const description = toValue(input.description) || defaultDescription
    const path = normalizePath(toValue(input.path) || '/')
    const canonical = toValue(input.canonical) || path
    const url = new URL(canonical, siteUrl).toString()
    const imageValue = toValue(input.image) || defaultSocialImage
    const image = new URL(imageValue, siteUrl).toString()
    const imageAlt = toValue(input.imageAlt) || defaultSocialImageAlt
    const type = toValue(input.type) || 'website'
    const noindex = Boolean(toValue(input.noindex))
    const publishedAt = toValue(input.publishedAt)
    const modifiedAt = toValue(input.modifiedAt)
    const tags = toValue(input.tags) || []

    document.title = title
    if (noindex) {
      removeCanonical()
    } else {
      upsertCanonical(url)
    }
    upsertFeedLink()
    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex' : 'index,follow',
    })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: siteName })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url })
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    })

    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: imageAlt })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
    upsertMeta('meta[name="twitter:image:alt"]', {
      name: 'twitter:image:alt',
      content: imageAlt,
    })

    if (type === 'article') {
      if (publishedAt) {
        upsertMeta('meta[property="article:published_time"]', {
          property: 'article:published_time',
          content: publishedAt,
        })
      }

      if (modifiedAt) {
        upsertMeta('meta[property="article:modified_time"]', {
          property: 'article:modified_time',
          content: modifiedAt,
        })
      }

      document.head
        .querySelectorAll<HTMLMetaElement>('meta[property="article:tag"]')
        .forEach((element) => element.remove())

      for (const tag of tags) {
        const element = document.createElement('meta')
        element.setAttribute('property', 'article:tag')
        element.setAttribute('content', tag)
        document.head.append(element)
      }
    } else {
      removeElement('meta[property="article:published_time"]')
      removeElement('meta[property="article:modified_time"]')
      document.head
        .querySelectorAll<HTMLMetaElement>('meta[property="article:tag"]')
        .forEach((element) => element.remove())
    }
  })
}
