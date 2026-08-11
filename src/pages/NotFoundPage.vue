<template>
  <section class="mx-auto max-w-2xl space-y-5 text-center">
    <h1 class="text-4xl font-semibold tracking-normal">Page not found</h1>
    <p class="text-muted-foreground">
      The page may have moved, or the URL may not match a published post.
    </p>
    <Button as-child>
      <RouterLink to="/">Go home</RouterLink>
    </Button>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useSeo } from '@/lib/seo'

useSeo({
  title: 'Page Not Found',
  description: 'The requested page could not be found.',
})
</script>
