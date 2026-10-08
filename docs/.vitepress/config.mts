import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'
import llmsVitePlugin, { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms'

import { version } from '../../package.json'

const ERepoRoot = fileURLToPath(new URL('../..', import.meta.url))

const ESiteOrigin =
  process.env.DOCS_ORIGIN ?? 'https://smartsquad.github.io/expo-apple-sign-in'
const EBase = process.env.DOCS_BASE ?? (process.env.GITHUB_ACTIONS ? '/expo-apple-sign-in/' : '/')
const ELlmsDomain = EBase === '/' ? undefined : new URL(ESiteOrigin).origin
const ESiteTitle = 'Expo Apple Sign In'
const ESiteDescription =
  'Sign in with Apple for Expo SDK 58 on iOS, Android and web, with one API, an Apple-style button and adapters for Supabase, Clerk and Firebase.'
const ERepo = 'https://github.com/smartsquad/expo-apple-sign-in'
const EOgImage = `${ESiteOrigin}/og.jpg`
const EOgImageAlt = 'Expo Apple Sign In: Sign in with Apple for Expo SDK 58 on iOS, Android and web.'

function publicAsset(file: string): string {
  return `${EBase}${file.replace(/^\//, '')}`
}

function pageCanonicalUrl(relativePath: string): string {
  const path = relativePath.replace(/index\.md$/, '').replace(/\.md$/, '.html')

  return `${ESiteOrigin}/${path}`
}

const ESidebar = [
  {
    text: 'Getting started',
    items: [
      { text: 'Introduction', link: '/intro' },
      { text: 'Requirements', link: '/getting-started/requirements' },
      { text: 'Installation', link: '/getting-started/installation' },
      { text: 'Compatibility', link: '/getting-started/compatibility' },
      { text: 'Quick start', link: '/getting-started/quick-start' },
    ],
    collapsed: false,
  },
  {
    text: 'Platform setup',
    items: [
      { text: 'Apple Developer', link: '/setup/apple-developer' },
      { text: 'iOS', link: '/setup/ios' },
      { text: 'Android', link: '/setup/android' },
      { text: 'Web', link: '/setup/web' },
      { text: 'Expo config', link: '/setup/expo' },
    ],
    collapsed: false,
  },
]

export default defineConfig({
  lang: 'en-US',
  title: ESiteTitle,
  description: ESiteDescription,
  base: EBase,
  outDir: '.vitepress/dist',
  cacheDir: '.vitepress/cache',
  cleanUrls: false,
  lastUpdated: false,
  appearance: true,
  ignoreDeadLinks: false,
  sitemap: {
    hostname: `${ESiteOrigin}/`,
  },
  transformPageData(pageData) {
    const url = pageCanonicalUrl(pageData.relativePath)
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
    )
  },
  head: [
    ['link', { rel: 'icon', href: publicAsset('favicon.ico'), sizes: 'any' }],
    ['link', { rel: 'icon', href: publicAsset('favicon-32x32.png'), type: 'image/png', sizes: '32x32' }],
    ['link', { rel: 'icon', href: publicAsset('favicon.svg'), type: 'image/svg+xml' }],
    ['link', { rel: 'icon', href: publicAsset('favicon-light.svg'), type: 'image/svg+xml', media: '(prefers-color-scheme: light)' }],
    ['link', { rel: 'icon', href: publicAsset('favicon-dark.svg'), type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' }],
    ['link', { rel: 'apple-touch-icon', href: publicAsset('apple-touch-icon.png'), sizes: '180x180' }],
    ['link', { rel: 'manifest', href: publicAsset('site.webmanifest') }],
    ['meta', { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#000000', media: '(prefers-color-scheme: dark)' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: ESiteTitle }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { property: 'og:title', content: ESiteTitle }],
    ['meta', { property: 'og:description', content: ESiteDescription }],
    ['meta', { property: 'og:image', content: EOgImage }],
    ['meta', { property: 'og:image:type', content: 'image/jpeg' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: EOgImageAlt }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@massimodeluisa' }],
    ['meta', { name: 'twitter:title', content: ESiteTitle }],
    ['meta', { name: 'twitter:description', content: ESiteDescription }],
    ['meta', { name: 'twitter:image', content: EOgImage }],
    ['meta', { name: 'twitter:image:alt', content: EOgImageAlt }],
  ],
  markdown: {
    theme: { light: 'min-light', dark: 'min-dark' },
    config(md) {
      md.use(groupIconMdPlugin)
      md.use(copyOrDownloadAsMarkdownButtons)
    },
  },
  themeConfig: {
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
      alt: ESiteTitle,
    },
    siteTitle: ESiteTitle,
    nav: [
      { text: 'Guide', link: '/intro' },
      {
        text: `v${version}`,
        items: [
          { text: 'Changelog', link: `${ERepo}/blob/main/CHANGELOG.md` },
          { text: 'npm', link: 'https://www.npmjs.com/package/expo-apple-sign-in' },
        ],
      },
    ],
    sidebar: ESidebar,
    socialLinks: [{ icon: 'github', link: ERepo }],
    editLink: {
      pattern: `${ERepo}/edit/develop/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Smart Squad Srl',
    },
    outline: { level: [2, 3] },
  },
  vite: {
    plugins: [
      groupIconVitePlugin(),
      llmsVitePlugin({
        title: ESiteTitle,
        domain: ELlmsDomain,
      }),
    ],
    ssr: {
      noExternal: ['vitepress-plugin-llms'],
    },
    server: {
      fs: {
        allow: [ERepoRoot],
      },
    },
  },
})
