import { watchEffect, type MaybeRefOrGetter, toValue } from 'vue'

const siteName = 'jasonjpeters.com'
const defaultDescription = 'Work, writing, and project notes from Jason Peters.'
const siteUrl = import.meta.env.VITE_SITE_URL || 'https://jasonjpeters.com'

type SeoInput = {
  title?: MaybeRefOrGetter<string | undefined>
  description?: MaybeRefOrGetter<string | undefined>
  path?: MaybeRefOrGetter<string | undefined>
  image?: MaybeRefOrGetter<string | undefined>
  type?: MaybeRefOrGetter<string | undefined>
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

export function useSeo(input: SeoInput = {}) {
  watchEffect(() => {
    const rawTitle = toValue(input.title)
    const title = rawTitle ? `${rawTitle} | ${siteName}` : siteName
    const description = toValue(input.description) || defaultDescription
    const path = toValue(input.path) || '/'
    const url = new URL(path, siteUrl).toString()
    const imageValue = toValue(input.image)
    const image = imageValue ? new URL(imageValue, siteUrl).toString() : undefined
    const type = toValue(input.type) || 'website'

    document.title = title
    upsertCanonical(url)
    upsertMeta('meta[name="description"]', { name: 'description', content: description })
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
      content: image ? 'summary_large_image' : 'summary',
    })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    })

    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
    }
  })
}
