<template>
  <article v-if="post" :class="post.type === 'graphic-art' ? 'mx-auto max-w-4xl' : 'mx-auto max-w-3xl'">
    <RouterLink to="/posts/" class="terminal-title text-sm uppercase text-muted-foreground hover:text-foreground">
      Back to posts
    </RouterLink>
    <header
      :class="[
        'mt-8 border-b border-border pb-8',
        post.type === 'graphic-art' ? 'grid gap-6 md:grid-cols-[1fr_16rem]' : '',
      ]"
    >
      <div>
        <p class="text-sm uppercase text-muted-foreground">
          <span v-if="post.type === 'graphic-art'">Graphic Art / </span>
          <time :datetime="post.date">{{ formattedDate }}</time>
        </p>
        <h1 class="mt-3 text-3xl font-semibold uppercase tracking-normal sm:text-5xl">
          {{ post.title }}
        </h1>
        <p class="mt-4 text-lg leading-8 text-muted-foreground">
          {{ post.description }}
        </p>
        <div v-if="post.tags?.length" class="mt-5 flex flex-wrap gap-2">
          <span
            v-for="tag in post.tags"
            :key="tag"
            class="border border-border bg-accent px-2.5 py-1 text-xs font-medium uppercase text-accent-foreground"
          >
            {{ tag }}
          </span>
        </div>
      </div>
      <aside v-if="post.type === 'graphic-art' && post.externalUrl" class="terminal-panel h-fit p-4 text-sm">
        <Button as="a" :href="post.externalUrl" target="_blank" rel="noreferrer" class="w-full" variant="outline">
          View Original
        </Button>
      </aside>
    </header>
    <figure v-if="post.image" class="mt-8">
      <img
        :src="post.image"
        :alt="post.imageAlt || post.title"
        class="terminal-image w-full border border-border object-cover"
      />
    </figure>
    <div class="prose-content mt-8">
      <component :is="post.component" />
    </div>
  </article>

  <NotFoundPage v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getPost } from '@/lib/content/posts'
import { useSeo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import NotFoundPage from '@/pages/NotFoundPage.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const post = computed(() => getPost(slug.value))
const formattedDate = computed(() =>
  post.value
    ? new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${post.value.date}T00:00:00`))
    : '',
)

useSeo({
  title: () => post.value?.title || 'Post Not Found',
  description: () => post.value?.description,
  path: () => post.value?.path || route.path,
  canonical: () => post.value?.canonical,
  image: () => post.value?.image,
  imageAlt: () => post.value?.imageAlt,
  type: 'article',
})
</script>
