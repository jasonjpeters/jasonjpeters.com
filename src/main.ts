import { createApp } from 'vue'
import '@fontsource/fira-code/latin-400.css'
import '@fontsource/fira-code/latin-500.css'
import '@fontsource/fira-code/latin-600.css'
import '@fontsource/fira-sans/latin-400.css'
import '@fontsource/fira-sans/latin-600.css'
import './style.css'
import App from './App.vue'
import { router } from './router'
import MarkdownCallout from './components/content/MarkdownCallout.vue'
import { Button } from './components/ui/button'

createApp(App)
  .use(router)
  .component('Button', Button)
  .component('MarkdownCallout', MarkdownCallout)
  .mount('#app')
