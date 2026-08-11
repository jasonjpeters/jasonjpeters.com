<template>
  <ul class="tech-stack" aria-label="Technology used to build this site">
    <li class="tech-stack__repo">
      <a
        class="tech-stack__link"
        href="https://github.com/jasonjpeters/jasonjpeters.com"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub repository"
        title="GitHub repository"
      >
        <svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="siGithub.path" fill="currentColor" />
        </svg>
      </a>
    </li>
    <li v-for="tech in techStack" :key="tech.name">
      <a
        class="tech-stack__link"
        :href="tech.href"
        target="_blank"
        rel="noreferrer"
        :aria-label="tech.name"
        :title="tech.name"
      >
        <svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="tech.path" fill="currentColor" />
        </svg>
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import {
  siGithub,
  siGithubpages,
  siMarkdown,
  siShadcnui,
  siTailwindcss,
  siVite,
  siVuedotjs,
} from 'simple-icons'

const techStack = [
  {
    name: siVuedotjs.title,
    href: 'https://vuejs.org/',
    path: siVuedotjs.path,
  },
  {
    name: siVite.title,
    href: 'https://vite.dev/',
    path: siVite.path,
  },
  {
    name: siTailwindcss.title,
    href: 'https://tailwindcss.com/',
    path: siTailwindcss.path,
  },
  {
    name: 'shadcn-vue',
    href: 'https://www.shadcn-vue.com/',
    path: siShadcnui.path,
  },
  {
    name: siMarkdown.title,
    href: 'https://www.markdownguide.org/',
    path: siMarkdown.path,
  },
  {
    name: siGithubpages.title,
    href: 'https://pages.github.com/',
    path: siGithubpages.path,
  },
]
</script>
