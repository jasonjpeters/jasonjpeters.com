<template>
  <section class="space-y-3">
    <h1 class="terminal-title text-3xl font-semibold uppercase tracking-normal">Posts</h1>
    <p class="max-w-2xl text-muted-foreground">
      Technical writing, project notes, graphic work, and practical writeups.
    </p>
  </section>

  <section class="mt-8" aria-labelledby="post-filters">
    <h2 id="post-filters" class="terminal-title text-sm font-semibold uppercase tracking-normal">
      Filter
    </h2>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="border border-border px-2.5 py-1 text-xs uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
        :class="selectedTag ? 'bg-secondary text-secondary-foreground' : 'bg-accent text-accent-foreground'"
        :aria-pressed="!selectedTag"
        @click="selectedTag = ''"
      >
        All
      </button>
      <button
        v-for="tag in tags"
        :key="tag.name"
        type="button"
        class="border border-border px-2.5 py-1 text-xs uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
        :class="selectedTag === tag.name ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'"
        :aria-pressed="selectedTag === tag.name"
        @click="selectedTag = tag.name"
      >
        {{ tag.name }} {{ tag.count }}
      </button>
    </div>
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
