<template>
  <section class="space-y-3">
    <h1 class="terminal-title text-3xl font-semibold uppercase tracking-normal">Posts</h1>
    <p class="max-w-2xl text-muted-foreground">
      Technical writing, project notes, graphic work, and practical writeups.
    </p>
  </section>

  <section class="mt-8" aria-labelledby="post-filters">
    <label id="post-filters" class="terminal-title block text-sm font-semibold uppercase tracking-normal" for="tag-filter">
      Filter
    </label>
    <select
      id="tag-filter"
      v-model="selectedTag"
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
import { computed, ref } from 'vue'
import { getPostTags, getPostsByTag, posts } from '@/lib/content/posts'
import { useSeo } from '@/lib/seo'
import PostList from '@/components/PostList.vue'

const selectedTag = ref('')
const tags = getPostTags()
const filteredPosts = computed(() => (selectedTag.value ? getPostsByTag(selectedTag.value) : posts))

useSeo({
  title: 'Posts',
  description: 'Technical posts, project notes, graphic work, and practical writeups.',
  path: '/posts/',
})
</script>
