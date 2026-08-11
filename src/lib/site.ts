import config from '../../site.config.json'

export interface TopicDefinition {
  slug: string
  name: string
  aliases?: string[]
  description: string
}

export interface SiteIdentity {
  name: string
  siteName: string
  url: string
  title: string
  description: string
  homepageIntro: string
  socialImage: string
  socialImageAlt: string
  author: {
    name: string
    displayName: string
    description: string
    url: string
    jobTitle?: string
    sameAs?: string[]
  }
  topics: string[]
  topicPageMinimumPosts: number
  topicDefinitions: TopicDefinition[]
}

export const site = config as SiteIdentity

export const siteUrl = import.meta.env.VITE_SITE_URL || site.url
export const siteName = site.name
export const defaultDescription = site.description
export const defaultSocialImage = site.socialImage
export const defaultSocialImageAlt = site.socialImageAlt

export function absoluteSiteUrl(path = '/') {
  return new URL(path, siteUrl).toString()
}
