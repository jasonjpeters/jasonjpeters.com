<template>
  <nav class="mb-8 text-xs uppercase text-muted-foreground" aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-2">
      <li v-for="(item, index) in items" :key="item.path || item.label" class="flex items-center gap-2">
        <RouterLink
          v-if="item.path && index < items.length - 1"
          :to="item.path"
          class="hover:text-foreground"
        >
          {{ item.label }}
        </RouterLink>
        <span v-else aria-current="page">{{ item.label }}</span>
        <span v-if="index < items.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  items: Array<{
    label: string
    path?: string
  }>
}>()
</script>
