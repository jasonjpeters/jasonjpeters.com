<template>
  <div class="terminal-shell flex min-h-svh flex-col bg-background text-foreground">
    <header class="border-b border-border bg-card/60">
      <div class="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-4 px-5 py-5">
        <TerminalPrompt :username="username" />
        <nav class="flex items-center gap-1 text-sm text-muted-foreground">
          <ThemeToggle :theme="theme" @toggle="toggleTheme" />
          <Button as-child variant="ghost" size="sm">
            <RouterLink to="/posts">Posts</RouterLink>
          </Button>
          <Button as-child variant="ghost" size="sm">
            <RouterLink to="/about">About</RouterLink>
          </Button>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:py-14">
      <RouterView />
    </main>
    <footer class="border-t border-border bg-card/60">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs uppercase text-muted-foreground">
        <p>&copy; {{ year }} Jason J. Peters. All rights reserved.</p>
        <TechStackIcons />
      </div>
    </footer>
    <StarWarsConsole />
    <UserNameModal :open="showNameModal" @submit="saveUsername" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import StarWarsConsole from '@/components/StarWarsConsole.vue'
import TechStackIcons from '@/components/TechStackIcons.vue'
import TerminalPrompt from '@/components/TerminalPrompt.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import UserNameModal from '@/components/UserNameModal.vue'
import { Button } from '@/components/ui/button'

const usernameStorageKey = 'terminal-username'
const themeStorageKey = 'terminal-theme'
const username = ref('guest')
const showNameModal = ref(false)
const theme = ref<'light' | 'dark'>('dark')
const year = new Date().getFullYear()

onMounted(() => {
  const storedTheme = localStorage.getItem(themeStorageKey)
  theme.value = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : preferredTheme()
  applyTheme(theme.value)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncSystemTheme)

  const storedUsername = localStorage.getItem(usernameStorageKey)

  if (storedUsername) {
    username.value = sanitizeUsername(storedUsername) || 'guest'
    return
  }

  showNameModal.value = true
})

onUnmounted(() => {
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', syncSystemTheme)
})

function preferredTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(value: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', value === 'dark')
  document.documentElement.classList.toggle('light', value === 'light')
  document.documentElement.style.colorScheme = value
}

function syncSystemTheme() {
  if (!localStorage.getItem(themeStorageKey)) {
    theme.value = preferredTheme()
    applyTheme(theme.value)
  }
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem(themeStorageKey, theme.value)
  applyTheme(theme.value)
}

function sanitizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function saveUsername(value: string) {
  username.value = sanitizeUsername(value) || 'guest'
  localStorage.setItem(usernameStorageKey, username.value)
  showNameModal.value = false
}
</script>
