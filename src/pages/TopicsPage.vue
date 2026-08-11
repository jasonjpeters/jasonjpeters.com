<template>
  <section class="space-y-3">
    <h1 class="terminal-title text-3xl font-semibold uppercase tracking-normal">Topics</h1>
    <p class="max-w-2xl text-muted-foreground">
      Technical subjects with enough published writing to work as focused entry points.
    </p>
  </section>

  <section class="mt-8">
    <div v-if="topics.length" class="terminal-panel divide-y divide-border">
      <article v-for="topic in topics" :key="topic.slug" class="px-4 py-5">
        <RouterLink :to="topic.path" class="group block">
          <p class="terminal-title text-xs uppercase text-muted-foreground">
            {{ topic.postCount }} {{ topic.postCount === 1 ? 'article' : 'articles' }}
          </p>
          <h2 class="terminal-title text-lg font-semibold uppercase tracking-normal group-hover:underline">
            {{ topic.name }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {{ topic.description }}
          </p>
        </RouterLink>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { posts } from '@/lib/content/posts'
import { useSeo } from '@/lib/seo'
import { eligibleTopicSummaries } from '@/lib/topics'

const topics = eligibleTopicSummaries(posts)

useSeo({
  title: 'Topics',
  description: 'Focused technical topic pages for published articles and development notes.',
  path: '/topics/',
})
</script>
