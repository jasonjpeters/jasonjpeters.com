<template>
  <div class="terminal-panel divide-y divide-border">
    <article v-for="post in posts" :key="post.slug" class="group px-4 py-5">
      <div :class="post.image ? 'grid gap-4 md:grid-cols-[10rem_1fr]' : ''">
        <RouterLink :to="post.path" class="block">
          <img
            v-if="post.image"
            :src="post.image"
            :alt="post.imageAlt || post.title"
            class="terminal-image aspect-[4/3] w-full border border-border object-cover md:w-40"
            loading="lazy"
            decoding="async"
          />
        </RouterLink>
        <div>
          <p class="terminal-title text-xs uppercase text-muted-foreground">
            &gt; <time :datetime="post.date">{{ formatDate(post.date) }}</time> | {{ postLabel(post.type) }}
          </p>
          <h2 class="terminal-title text-lg font-semibold uppercase tracking-normal">
            <RouterLink :to="post.path" class="hover:underline">
              {{ post.title }}
            </RouterLink>
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {{ post.description }}
          </p>
          <div v-if="post.tags?.length" class="mt-3 flex flex-wrap gap-2">
            <RouterLink
              v-for="tag in linkedTags(post)"
              :key="tag.label"
              :to="tag.path"
              class="border border-border bg-secondary px-2 py-1 text-xs uppercase text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {{ tag.label }}
            </RouterLink>
            <span
              v-for="tag in plainTags(post)"
              :key="tag"
              class="border border-border bg-secondary px-2 py-1 text-xs uppercase text-secondary-foreground"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { posts as allPosts, type Post } from '@/lib/content/posts'
import { eligibleTopicSummaries, topicLinkForTag } from '@/lib/topics'

defineProps<{
  posts: Post[]
}>()

const topics = eligibleTopicSummaries(allPosts)

function linkedTags(post: Post) {
  return (post.tags || [])
    .map((tag) => {
      const topic = topicLinkForTag(tag, topics)

      return topic
        ? {
            label: tag,
            path: topic.path,
          }
        : undefined
    })
    .filter((tag): tag is { label: string; path: string } => Boolean(tag))
}

function plainTags(post: Post) {
  return (post.tags || []).filter((tag) => !topicLinkForTag(tag, topics))
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function postLabel(type: Post['type']) {
  return type === 'graphic-art' ? 'Graphic Art' : 'Development'
}
</script>
