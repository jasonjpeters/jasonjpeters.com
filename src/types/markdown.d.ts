declare module '*.md' {
  import type { Component } from 'vue'

  const component: Component
  export const frontmatter: Record<string, unknown>
  export default component
}
