import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

// RouterProvider는 마운트 시 스크롤 복원을 시도해 window.scrollTo를 호출한다.
// jsdom의 scrollTo는 "Not implemented" 콘솔 에러를 남기는 스텁이라 출력을 더럽힌다 — 조용히 대체.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {}
}

/** 컴포넌트가 <Link>를 쓰면 라우터 컨텍스트가 필요하다. 메모리 히스토리로 감싸 렌더한다.
 *  RouterProvider는 최초 매치를 비동기로 로드하므로(router.load()), 렌더 전에 미리 로드해
 *  테스트가 동기 assert 가능하게 한다(async 함수 — 호출부에서 await 필요). */
export async function renderWithRouter(ui: ReactNode, initialPath = '/') {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <>{ui}</> })
  const comingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/coming', component: () => <>{ui}</> })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, comingRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  await router.load()
  return render(<RouterProvider router={router} />)
}
