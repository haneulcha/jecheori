# TanStack Start 스캐폴드·프리렌더 스파이크 결과 (2026-07-11)

**게이트: GREEN.** 로더가 로컬 JSON을 읽어 **순수 정적 HTML로 프리렌더**됨을 확인.
(스크래치패드에서 검증 — CLI `@tanstack/cli@0.69.5`, TanStack Start alpha)

## 확정된 관례

**스캐폴드 (비대화)**
```bash
npx @tanstack/cli@latest create <name> --framework React \
  --package-manager npm --no-examples --no-git --no-toolchain --no-intent --yes
```

**구조**: `src/routes/{__root,index}.tsx`, `src/router.tsx`, `src/routeTree.gen.ts`(생성물),
`vite.config.ts`, `tsconfig.json`. `public/`.

**라우트 로더 + 데이터** (`src/routes/index.tsx`)
```tsx
import { createFileRoute } from '@tanstack/react-router'
import produce from '../data/produce.json'   // 로컬 JSON import — 빌드/프리렌더 시점 실행

export const Route = createFileRoute('/')({
  loader: async () => ({ count: (produce as unknown[]).length }),
  component: Home,
})
function Home() {
  const { count } = Route.useLoaderData()    // 타입 안전 로더 데이터
  return <h1>제철 프로필 {count}종</h1>
}
```

**프리렌더 (SSG)** — `vite.config.ts`:
```ts
tanstackStart({ prerender: { enabled: true, crawlLinks: true } })
```
빌드: `npm run build`. 산출물: **`dist/client/index.html`** = 프리렌더된 정적 HTML
(로더 데이터가 SSR되어 박힘). 클라 에셋은 `dist/client/assets/`, 서버 번들 `dist/server/`.

## 스캐폴드가 이미 포함한 것 (우리 계획에 유리)
- 런타임: `@tanstack/react-start`·`@tanstack/react-router`·`react`·`react-dom`, Vite 플러그인.
- devDep: **`@testing-library/react`·jsdom·@types/node·@vitejs/plugin-react·vitest·typescript**
  → 우리 컴포넌트 테스트 계획에 필요한 것 다 있음. **@types/node 포함 → 기존 tsc 노이즈 해소.**

## 주의 / 트레이드오프 (기록)
1. **Tailwind 강제 포함** — CLI가 `--no-tailwind`를 무시(`@tailwindcss/vite` + `tailwindcss`
   deps). 우리는 `style.css`를 쓰므로 실제 이식 때 **Tailwind 제거 또는 무시** 결정 필요.
   (index route의 `className="p-8"` 등 데모 클래스도 교체 대상.)
2. **번들 크기** — 스파이크 클라 JS ~340KB (gzip ~106KB) vs 현재 ~10KB. 페이지 자체는
   정적 프리렌더로 JS 없이 보이지만, 하이드레이션 JS가 큼. "경량" 원칙과의 간극 —
   추후 정적 라우트 선택적/무하이드레이션 최적화 여지(고급, 별도).
3. `devtools` 플러그인은 빌드에서 자동 제거됨("Removed devtools code").

## 결론
스펙의 alpha 프리렌더 리스크 게이트 통과. 계획대로 진행 가능. 실제 이식은 이 관례 위에서
`src/`의 순수 모듈을 얹고 `render.ts`→컴포넌트, `main.ts`→라우트/로더로 대체.
