import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Markdown({
      markdownOptions: {
        html: true,
        linkify: true,
        typographer: true,
      },
      markdownItSetup(markdown) {
        const defaultHeadingOpen =
          markdown.renderer.rules.heading_open ||
          ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

        markdown.renderer.rules.heading_open = (tokens, index, options, env, self) => {
          const token = tokens[index]
          const contentToken = tokens[index + 1]
          const headingIds = ((env.headingIds ||= {}) as Record<string, number>)
          const base = slugifyHeading(contentToken?.content || '')

          if (base) {
            const count = headingIds[base] || 0
            headingIds[base] = count + 1
            token.attrSet('id', count ? `${base}-${count + 1}` : base)
          }

          return defaultHeadingOpen(tokens, index, options, env, self)
        }
      },
      wrapperClasses: 'markdown-component',
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
