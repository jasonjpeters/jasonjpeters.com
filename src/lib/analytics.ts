import type { Router } from 'vue-router'

declare global {
  interface Window {
    __GA_MEASUREMENT_ID__?: string
    gtag?: (...args: unknown[]) => void
  }
}

function trackPageView(path: string) {
  const measurementId = window.__GA_MEASUREMENT_ID__

  if (!measurementId || !window.gtag) {
    return
  }

  window.gtag('config', measurementId, {
    page_path: path,
    page_location: new URL(path, window.location.origin).toString(),
    page_title: document.title,
  })
}

export function installAnalytics(router: Router) {
  router.isReady().then(() => {
    router.afterEach((to) => {
      window.requestAnimationFrame(() => {
        trackPageView(to.fullPath)
      })
    })
  })
}
