import { site, type TopicDefinition } from './site'

export type TopicSummary = TopicDefinition & {
  path: string
  postCount: number
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function topicPath(slug: string) {
  return `/topics/${slug}/`
}

export function tagFilterPath(tag: string) {
  return `/posts/?tag=${encodeURIComponent(tag)}`
}

const topicDefinitions = site.topicDefinitions

const topicLookup = new Map<string, TopicDefinition>()

for (const topic of topicDefinitions) {
  topicLookup.set(slugify(topic.slug), topic)
  topicLookup.set(slugify(topic.name), topic)

  for (const alias of topic.aliases || []) {
    topicLookup.set(slugify(alias), topic)
  }
}

export function normalizeTag(tag: string) {
  return slugify(tag)
}

export function topicForTag(tag: string) {
  return topicLookup.get(normalizeTag(tag))
}

export function normalizedTopicsForTags(tags: string[] = []) {
  const topics = new Map<string, TopicDefinition>()

  for (const tag of tags) {
    const topic = topicForTag(tag)

    if (topic) {
      topics.set(topic.slug, topic)
    }
  }

  return [...topics.values()]
}

export function countTopicPosts<T extends { tags?: string[]; type?: string }>(posts: T[]) {
  const counts = new Map<string, number>()

  for (const post of posts) {
    if (post.type === 'graphic-art') {
      continue
    }

    for (const topic of normalizedTopicsForTags(post.tags)) {
      counts.set(topic.slug, (counts.get(topic.slug) || 0) + 1)
    }
  }

  return counts
}

export function eligibleTopicSummaries<T extends { tags?: string[]; type?: string }>(posts: T[]) {
  const counts = countTopicPosts(posts)

  return topicDefinitions
    .map((topic) => ({
      ...topic,
      path: topicPath(topic.slug),
      postCount: counts.get(topic.slug) || 0,
    }))
    .filter((topic) => topic.postCount >= site.topicPageMinimumPosts)
}

export function isEligibleTopic(tag: string, eligibleTopics: TopicSummary[]) {
  const topic = topicForTag(tag)
  return Boolean(topic && eligibleTopics.some((eligible) => eligible.slug === topic.slug))
}

export function topicLinkForTag(tag: string, eligibleTopics: TopicSummary[]) {
  const topic = topicForTag(tag)

  if (!topic || !isEligibleTopic(tag, eligibleTopics)) {
    return undefined
  }

  return {
    name: topic.name,
    path: topicPath(topic.slug),
  }
}

export function linkForTag(tag: string, eligibleTopics: TopicSummary[]) {
  return {
    label: tag,
    path: tagFilterPath(topicLinkForTag(tag, eligibleTopics)?.name || tag),
  }
}
