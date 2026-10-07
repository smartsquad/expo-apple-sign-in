/// <reference types="vitepress/client" />

declare module '*.svg?raw' {
  const content: string
  export default content
}

declare module '*?raw' {
  const content: string
  export default content
}

declare module 'virtual:group-icons.css'
declare module 'vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue'
declare module '../../package.json' {
  export const version: string
}
