<template>
  <aside class="my-6 rounded-md border border-border bg-card p-4 text-card-foreground">
    <div class="flex gap-3">
      <Info class="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div class="min-w-0">
        <p v-if="title" class="mb-1 font-medium text-foreground">{{ title }}</p>
        <div class="text-sm leading-6 text-muted-foreground">
          <slot />
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Info } from '@lucide/vue'

defineProps<{
  title?: string
}>()
</script>
