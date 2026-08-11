<template>
  <div class="terminal-panel divide-y divide-border">
    <article v-for="post in posts" :key="post.slug" class="px-4 py-5">
      <RouterLink :to="post.path" class="group block">
        <div :class="post.image ? 'grid gap-4 md:grid-cols-[10rem_1fr]' : ''">
          <img
            v-if="post.image"
            :src="post.image"
            :alt="post.title"
            class="terminal-image aspect-[4/3] w-full border border-border object-cover md:w-40"
            loading="lazy"
          />
          <div>
          <p class="terminal-title text-xs uppercase text-muted-foreground">
            &gt; <time :datetime="post.date">{{ formatDate(post.date) }}</time> | {{ postLabel(post.type) }}
          </p>
          <h2 class="terminal-title text-lg font-semibold uppercase tracking-normal group-hover:underline">
            {{ post.title }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {{ post.description }}
          </p>
          <div v-if="post.tags?.length" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="border border-border bg-secondary px-2 py-1 text-xs uppercase text-secondary-foreground"
            >
              {{ tag }}
            </span>
          </div>
          </div>
        </div>
      </RouterLink>
    </article>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Post } from '@/lib/content/posts'

defineProps<{
  posts: Post[]
}>()

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function postLabel(type: Post['type']) {
  return type === 'graphic-art' ? 'Graphic Art' : 'Post'
}
</script>
