<template>
  <div class="terminal-prompt" @click="focusInput">
    <form class="terminal-prompt__line" @submit.prevent="runCommand">
      <RouterLink to="/" class="terminal-prompt__host" aria-label="Home">
        {{ username }}@jasonjpeters.com
      </RouterLink>
      <span class="terminal-prompt__path">:{{ promptPath }}$</span>
      <input
        ref="inputRef"
        v-model="command"
        class="terminal-prompt__input"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Terminal command"
        placeholder="ls"
      />
    </form>
    <p v-if="output" class="terminal-prompt__output" aria-live="polite">
      {{ output }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { posts } from '@/lib/content/posts'

const router = useRouter()
defineProps<{
  username: string
}>()

const command = ref('')
const output = ref('try: ls, cd posts, cd about')
const inputRef = ref<HTMLInputElement>()

const cwd = computed(() => router.currentRoute.value.path || '/')
const promptPath = computed(() => {
  const path = cwd.value

  if (path === '/') {
    return '~'
  }

  if (path === '/posts') {
    return '~/posts'
  }

  if (path.startsWith('/posts/')) {
    const slug = path.replace('/posts/', '')
    return `~/posts/${compactSlug(slug)}`
  }

  return `~${path}`
})

const directories: Record<string, string> = {
  '~': '/',
  '/': '/',
  '.': '',
  home: '/',
  posts: '/posts',
  '/posts': '/posts',
  about: '/about',
  '/about': '/about',
}

function normalizePath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

function compactSlug(slug: string) {
  if (slug.length <= 18) {
    return slug
  }

  return `${slug.slice(0, 7)}...${slug.slice(-8)}`
}

function resolvePath(target = '.') {
  if (target === '.' || target === '') {
    return cwd.value
  }

  if (target === '..') {
    return cwd.value.split('/').slice(0, -1).join('/') || '/'
  }

  if (directories[target]) {
    return directories[target]
  }

  if (target.startsWith('/')) {
    return normalizePath(target)
  }

  return normalizePath(`${cwd.value.replace(/\/$/, '')}/${target}`)
}

function list(target = '.') {
  const normalized = resolvePath(target)

  if (normalized === '/') {
    return 'about/  posts/'
  }

  if (normalized === '/posts') {
    return posts.map((post) => `${post.slug}/`).join('  ')
  }

  const post = posts.find((item) => item.path === normalized)

  if (normalized === '/about' || post) {
    return ''
  }

  return `ls: cannot access '${target}': No such file or directory`
}

function changeDirectory(target = '/') {
  const route = resolvePath(target)
  const canNavigate =
    route === '/' || route === '/about' || route === '/posts' || posts.some((post) => post.path === route)

  if (!canNavigate) {
    return `cd: no such file or directory: ${target}`
  }

  router.push(route)
  return route
}

function runLinuxCommand(input: string) {
  const [binary = '', ...args] = input.split(/\s+/)

  if (input === 'starwars') {
    window.dispatchEvent(new Event('terminal:starwars'))
    return 'opening browser asciimation'
  }

  switch (binary) {
    case 'ls':
      return list(args[0])
    case 'cd':
      return changeDirectory(args[0] || '/')
    default:
      return `${binary}: command not found`
  }
}

function runCommand() {
  const entered = command.value.trim().toLowerCase()
  command.value = ''

  if (!entered) {
    return
  }

  const result = runLinuxCommand(entered)
  output.value = result ?? ''
}

function focusInput() {
  inputRef.value?.focus()
}
</script>
