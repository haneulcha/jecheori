import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import comingPrices from '../../public/data/coming-prices.json'
import nutrition from '../../public/data/nutrition.json'
import recipes from '../../public/data/recipes.json'
import { buildComingView } from '../app'
import { Coming } from '../components/Coming'
import type { ComingPriceSeed, NutritionSnapshot, ProduceProfile, RecipeSnapshot } from '../types'

export const Route = createFileRoute('/coming')({
  loader: async () =>
    buildComingView(
      produce as unknown as ProduceProfile[],
      comingPrices as unknown as ComingPriceSeed,
      nutrition as unknown as NutritionSnapshot,
      recipes as unknown as RecipeSnapshot,
      new Date(),
    ),
  component: ComingPage,
})

function ComingPage() {
  const view = Route.useLoaderData()
  // date는 로더 직렬화 경계를 넘으며 문자열이 될 수 있어 Date로 되살린다.
  return <Coming view={{ ...view, date: new Date(view.date) }} />
}
