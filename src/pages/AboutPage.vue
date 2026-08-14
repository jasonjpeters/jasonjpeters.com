<template>
  <section v-if="page" class="prose-content">
    <component :is="page.component" />
  </section>
  <NotFoundPage v-else />
</template>

<script setup lang="ts">
import { getPage } from '@/lib/content/pages'
import { useSeo } from '@/lib/seo'
import NotFoundPage from '@/pages/NotFoundPage.vue'

const page = getPage('about')

useSeo({
  title: page?.title || 'Page Not Found',
  description: page?.description,
  path: page?.path || '/about/',
  canonical: page?.canonical,
})
</script>
