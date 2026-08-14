<template>
  <section class="space-y-3">
    <h1 class="terminal-title text-3xl font-semibold uppercase tracking-normal">{{ pageTitle }}</h1>
    <p class="max-w-2xl text-muted-foreground">
      {{ pageDescription }}
    </p>
  </section>

  <section class="mt-8" aria-labelledby="post-filters">
    <label id="post-filters" class="terminal-title block text-sm font-semibold uppercase tracking-normal" for="tag-filter">
      Filter
    </label>
    <select
      id="tag-filter"
      :value="selectedTag"
      @change="updateSelectedTag(($event.target as HTMLSelectElement).value)"
      class="mt-3 w-full max-w-xs border border-border bg-background px-3 py-2 text-sm uppercase text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">All posts</option>
      <option v-for="tag in tags" :key="tag.name" :value="tag.name">
        {{ tag.name }} ({{ tag.count }})
      </option>
    </select>
  </section>

  <section class="mt-8">
    <p v-if="selectedTag" class="mb-4 text-sm uppercase text-muted-foreground" aria-live="polite">
      Showing {{ filteredPosts.length }} {{ filteredPosts.length === 1 ? 'post' : 'posts' }} tagged
      {{ selectedTag }}.
    </p>
    <PostList :posts="filteredPosts" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostTags, getPostsByTag, posts } from '@/lib/content/posts'
import { useSeo } from '@/lib/seo'
import { topicForTag } from '@/lib/topics'
import PostList from '@/components/PostList.vue'

const route = useRoute()
const router = useRouter()
const selectedTag = computed(() => String(route.query.tag || ''))
const selectedTopic = computed(() => (selectedTag.value ? topicForTag(selectedTag.value) : undefined))
const tags = getPostTags()
const filteredPosts = computed(() =>
  selectedTag.value
    ? selectedTopic.value
      ? posts.filter((post) => post.topicSlugs.includes(selectedTopic.value?.slug || ''))
      : getPostsByTag(selectedTag.value)
    : posts,
)
const pageTitle = computed(() =>
  selectedTopic.value
    ? selectedTopic.value.name
    : selectedTag.value
      ? selectedTag.value
      : 'Posts',
)
const pageDescription = computed(() =>
  selectedTopic.value
    ? selectedTopic.value.description
    : selectedTag.value
      ? `Posts tagged ${selectedTag.value}.`
      : 'Technical writing, project notes, graphic work, and practical writeups.',
)

function updateSelectedTag(value: string) {
  router.push({
    path: '/posts/',
    query: value ? { tag: value } : {},
  })
}

useSeo({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  path: '/posts/',
})
</script>
