import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import prices from '../../public/data/prices.json'
import nutrition from '../../public/data/nutrition.json'
import recipes from '../../public/data/recipes.json'
import { buildAppView } from '../app'
import { App } from '../components/App'
import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from '../types'

export const Route = createFileRoute('/')({
  loader: async () =>
    buildAppView(
      produce as unknown as ProduceProfile[],
      prices as unknown as PriceSnapshot,
      nutrition as unknown as NutritionSnapshot,
      recipes as unknown as RecipeSnapshot,
      new Date(),
    ),
  component: Home,
})

function Home() {
  const view = Route.useLoaderData()
  // date는 로더 직렬화 경계를 넘으며 문자열이 될 수 있어 Date로 되살린다.
  return <App view={{ ...view, date: new Date(view.date) }} />
}
