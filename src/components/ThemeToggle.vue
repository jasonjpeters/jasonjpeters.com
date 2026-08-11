<template>
  <label class="theme-switch">
    <span class="theme-switch__label">{{ theme }}</span>
    <SwitchRoot
      class="theme-switch__root"
      :checked="theme === 'dark'"
      :aria-label="`Switch to ${nextTheme} mode`"
      @update:checked="$emit('toggle')"
    >
      <SwitchThumb class="theme-switch__thumb" />
    </SwitchRoot>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SwitchRoot, SwitchThumb } from 'radix-vue'

const props = defineProps<{
  theme: 'light' | 'dark'
}>()

defineEmits<{
  toggle: []
}>()

const nextTheme = computed(() => (props.theme === 'dark' ? 'light' : 'dark'))
</script>
