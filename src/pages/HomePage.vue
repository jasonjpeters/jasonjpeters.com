<template>
  <section>
    <div class="space-y-6">
      <p
        v-if="page?.eyebrow"
        class="terminal-title text-sm font-medium uppercase tracking-normal text-muted-foreground"
      >
        {{ page.eyebrow }}
      </p>
      <h1 class="max-w-3xl text-3xl font-semibold uppercase tracking-normal text-foreground sm:text-5xl">
        {{ page?.heroTitle || page?.title || 'Portfolio and Posts' }}
      </h1>
      <p class="max-w-2xl text-lg leading-8 text-muted-foreground">
        {{ page?.description }}
      </p>
      <div v-if="page" class="prose-content">
        <component :is="page.component" />
      </div>
    </div>
  </section>

  <section class="mt-14">
    <div class="mb-6 flex items-center justify-between gap-4">
      <h2 class="terminal-title text-xl font-semibold uppercase tracking-normal">Latest Posts</h2>
      <Button as-child variant="outline" size="sm">
        <RouterLink to="/posts/">View all</RouterLink>
      </Button>
    </div>
    <PostList :posts="posts.slice(0, 4)" />
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { posts } from '@/lib/content/posts'
import { getPage } from '@/lib/content/pages'
import { useSeo } from '@/lib/seo'
import PostList from '@/components/PostList.vue'
import { Button } from '@/components/ui/button'

const page = getPage('home')

useSeo({
  title: page?.seoTitle || 'Jason Peters | Software, Web, and Systems Development',
  description:
    page?.description ||
    'Technical writing, web development notes, infrastructure experiments, and project work from Jason Peters.',
  path: '/',
})
</script>
