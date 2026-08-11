<template>
  <section v-if="isOpen" class="starwars-console" role="dialog" aria-modal="true">
    <div class="starwars-console__bar">
      <span>$ open https://www.asciimation.co.nz/</span>
      <button class="starwars-console__close" type="button" @click="close">esc</button>
    </div>
    <iframe
      class="starwars-console__frame"
      title="Star Wars ASCIImation by Simon Jansen"
      src="https://www.asciimation.co.nz/"
    />
    <p class="starwars-console__credit">
      Animation by Simon Jansen - asciimation.co.nz
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const isOpen = ref(false)

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('terminal:starwars', open)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('terminal:starwars', open)
  window.removeEventListener('keydown', onKeydown)
})
</script>
