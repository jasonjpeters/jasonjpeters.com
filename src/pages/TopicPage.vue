<template>
  <section v-if="topic" class="mx-auto max-w-3xl">
    <BreadcrumbNav
      :items="[
        { label: 'Home', path: '/' },
        { label: 'Topics', path: '/topics/' },
        { label: topic.name },
      ]"
    />

    <header class="space-y-4 border-b border-border pb-8">
      <p class="terminal-title text-sm font-medium uppercase tracking-normal text-muted-foreground">Topic</p>
      <h1 class="text-3xl font-semibold uppercase tracking-normal sm:text-5xl">
        {{ topic.name }}
      </h1>
      <p class="text-lg leading-8 text-muted-foreground">
        {{ topic.description }}
      </p>
    </header>

    <section class="mt-8" aria-labelledby="topic-articles">
      <h2 id="topic-articles" class="terminal-title mb-4 text-xl font-semibold uppercase tracking-normal">
        Articles
      </h2>
      <PostList :posts="topicPosts" />
    </section>
  </section>

  <NotFoundPage v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BreadcrumbNav from '@/components/BreadcrumbNav.vue'
import PostList from '@/components/PostList.vue'
import { posts } from '@/lib/content/posts'
import { useSeo } from '@/lib/seo'
import { eligibleTopicSummaries } from '@/lib/topics'
import NotFoundPage from '@/pages/NotFoundPage.vue'

const route = useRoute()
const eligibleTopics = eligibleTopicSummaries(posts)
const topic = computed(() => eligibleTopics.find((item) => item.slug === String(route.params.slug || '')))
const topicPosts = computed(() =>
  topic.value
    ? posts.filter((post) => post.type !== 'graphic-art' && post.topicSlugs.includes(topic.value?.slug || ''))
    : [],
)

useSeo({
  title: () => (topic.value ? `${topic.value.name} Articles` : 'Topic Not Found'),
  description: () => topic.value?.description,
  path: () => topic.value?.path || route.path,
})
</script>
