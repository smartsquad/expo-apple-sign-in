import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import CopyOrDownloadAsMarkdownButtons from './components/CopyPageButtons.vue'
import 'virtual:group-icons.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'home-hero-info-before': () => h('p', { class: 'hero-eyebrow' }, 'EXPO SDK 58 · MODULES 2.0'),
  }),
  enhanceApp({ app }) {
    app.component('CopyOrDownloadAsMarkdownButtons', CopyOrDownloadAsMarkdownButtons)
  },
} satisfies Theme
