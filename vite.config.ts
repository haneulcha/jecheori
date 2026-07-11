import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  // 루트 서빙은 '/', GitHub Pages 프로젝트 하위경로는 BASE_PATH=/jecheori/
  base: process.env.BASE_PATH ?? '/',
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart({ prerender: { enabled: true, crawlLinks: true } }),
    viteReact(),
  ],
})
