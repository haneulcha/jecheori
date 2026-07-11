import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import prices from '../../public/data/prices.json'
import { buildAppView } from '../app'
import type { PriceSnapshot, ProduceProfile } from '../types'

// Task 1(스캐폴드+파이프라인 검증)용 최소 라우트. 실제 UI(App 컴포넌트)는 후속 태스크.
export const Route = createFileRoute('/')({
  loader: async () => {
    const view = buildAppView(
      produce as unknown as ProduceProfile[],
      prices as unknown as PriceSnapshot,
      new Date(),
    )
    return {
      names: view.cards.map((c) => c.name),
      coming: view.coming.map((c) => c.name),
    }
  },
  component: Home,
})

function Home() {
  const { names, coming } = Route.useLoaderData()
  return (
    <div id="spike">
      <h1>이번 주 싸진 제철 ({names.length}종)</h1>
      <ul>
        {names.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      {coming.length > 0 && <p>곧 제철: {coming.join(', ')}</p>}
    </div>
  )
}
