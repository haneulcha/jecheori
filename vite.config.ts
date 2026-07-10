import { defineConfig } from 'vite'

// Cloudflare Pages(루트 서빙)는 '/', GitHub Pages(프로젝트 하위 경로)는
// BASE_PATH=/jecheori/ 로 빌드한다. 기본값은 루트.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
})
