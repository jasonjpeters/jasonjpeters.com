<template>
  <section v-if="open" class="username-modal" role="dialog" aria-modal="true">
    <form class="username-modal__panel" @submit.prevent="submit">
      <p class="terminal-title text-sm uppercase text-muted-foreground">Identify user</p>
      <label class="username-modal__label" for="visitor-name">Name</label>
      <input
        id="visitor-name"
        ref="inputRef"
        v-model="name"
        class="username-modal__input"
        autocomplete="name"
        autofocus
        placeholder="user-name"
      />
      <p class="text-xs text-muted-foreground">
        Prompt will use: {{ preview }}@jasonjpeters.com
      </p>
      <Button type="submit" class="w-full">Continue</Button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  submit: [username: string]
}>()

const name = ref('')
const inputRef = ref<HTMLInputElement>()
const preview = computed(() => sanitizeUsername(name.value) || 'guest')

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      inputRef.value?.focus()
    }
  },
  { immediate: true },
)

function sanitizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function submit() {
  emit('submit', preview.value)
}
</script>
