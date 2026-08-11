<template>
  <article v-if="post" :class="post.type === 'graphic-art' ? 'mx-auto max-w-4xl' : 'mx-auto max-w-3xl'">
    <BreadcrumbNav
      :items="[
        { label: 'Home', path: '/' },
        { label: 'Posts', path: '/posts/' },
        { label: post.title },
      ]"
    />
    <header
      :class="[
        'mt-8 border-b border-border pb-8',
        post.type === 'graphic-art' ? 'grid gap-6 md:grid-cols-[1fr_16rem]' : '',
      ]"
    >
      <div>
        <p class="text-sm uppercase text-muted-foreground">
          <span>{{ postLabel(post.type) }} / </span>
          Published <time :datetime="post.date">{{ formattedDate }}</time>
          <span v-if="post.updated">
            / Updated <time :datetime="post.updated">{{ formattedUpdatedDate }}</time>
          </span>
        </p>
        <h1 class="mt-3 text-3xl font-semibold uppercase tracking-normal sm:text-5xl">
          {{ post.title }}
        </h1>
        <p class="mt-4 text-lg leading-8 text-muted-foreground">
          {{ post.description }}
        </p>
        <div v-if="post.tags?.length" class="mt-5 flex flex-wrap gap-2">
          <RouterLink
            v-for="tag in linkedTags"
            :key="tag.label"
            :to="tag.path"
            class="border border-border bg-accent px-2.5 py-1 text-xs font-medium uppercase text-accent-foreground hover:bg-secondary hover:text-secondary-foreground"
          >
            {{ tag.label }}
          </RouterLink>
          <span
            v-for="tag in plainTags"
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
        decoding="async"
      />
    </figure>
    <nav v-if="tocHeadings.length" class="terminal-panel mt-8 p-4 text-sm" aria-labelledby="table-of-contents">
      <h2 id="table-of-contents" class="terminal-title text-sm font-semibold uppercase tracking-normal">
        Contents
      </h2>
      <ol class="mt-3 space-y-2 text-muted-foreground">
        <li v-for="heading in tocHeadings" :key="heading.id" :class="heading.level === 3 ? 'pl-4' : ''">
          <a :href="`#${heading.id}`" class="hover:text-foreground">{{ heading.text }}</a>
        </li>
      </ol>
    </nav>
    <div class="prose-content mt-8">
      <component :is="post.component" />
    </div>
    <section v-if="relatedPosts.length" class="mt-12 border-t border-border pt-8" aria-labelledby="related-articles">
      <h2 id="related-articles" class="terminal-title mb-4 text-xl font-semibold uppercase tracking-normal">
        Related Articles
      </h2>
      <PostList :posts="relatedPosts" />
    </section>
  </article>

  <NotFoundPage v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BreadcrumbNav from '@/components/BreadcrumbNav.vue'
import PostList from '@/components/PostList.vue'
import { getPost, getRelatedPosts, posts } from '@/lib/content/posts'
import { useSeo } from '@/lib/seo'
import { eligibleTopicSummaries, topicLinkForTag } from '@/lib/topics'
import { Button } from '@/components/ui/button'
import NotFoundPage from '@/pages/NotFoundPage.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const post = computed(() => getPost(slug.value))
const eligibleTopics = eligibleTopicSummaries(posts)
const formattedDate = computed(() =>
  post.value
    ? new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${post.value.date}T00:00:00`))
    : '',
)
const formattedUpdatedDate = computed(() =>
  post.value?.updated
    ? new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${post.value.updated}T00:00:00`))
    : '',
)
const tocHeadings = computed(() => (post.value && post.value.headings.length >= 3 ? post.value.headings : []))
const relatedPosts = computed(() => (post.value ? getRelatedPosts(post.value) : []))
const linkedTags = computed(() =>
  (post.value?.tags || [])
    .map((tag) => {
      const topic = topicLinkForTag(tag, eligibleTopics)

      return topic
        ? {
            label: tag,
            path: topic.path,
          }
        : undefined
    })
    .filter((tag): tag is { label: string; path: string } => Boolean(tag)),
)
const plainTags = computed(() =>
  (post.value?.tags || []).filter((tag) => !topicLinkForTag(tag, eligibleTopics)),
)

function postLabel(type?: string) {
  return type === 'graphic-art' ? 'Graphic Art' : 'Development'
}

useSeo({
  title: () => post.value?.title || 'Post Not Found',
  description: () => post.value?.description,
  path: () => post.value?.path || route.path,
  canonical: () => post.value?.canonical,
  image: () => post.value?.image,
  imageAlt: () => post.value?.imageAlt,
  type: 'article',
  publishedAt: () => post.value?.date,
  modifiedAt: () => post.value?.updated || post.value?.date,
  tags: () => post.value?.tags,
})
</script>
