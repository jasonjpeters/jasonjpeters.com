<template>
  <section class="space-y-3">
    <h1 class="terminal-title text-3xl font-semibold uppercase tracking-normal">Posts</h1>
    <p class="max-w-2xl text-muted-foreground">
      Markdown-authored updates, project notes, and writeups.
    </p>
  </section>

  <section class="mt-8">
    <PostList :posts="posts" />
  </section>
</template>

<script setup lang="ts">
import { posts } from '@/lib/content/posts'
import { useSeo } from '@/lib/seo'
import PostList from '@/components/PostList.vue'

useSeo({
  title: 'Posts',
  description: 'Technical posts, project notes, and Markdown-authored writeups from Jason Peters.',
  path: '/posts/',
})
</script>
