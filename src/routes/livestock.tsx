import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import prices from '../../public/data/prices.json'
import nutrition from '../../public/data/nutrition.json'
import recipes from '../../public/data/recipes.json'
import { buildLivestockView } from '../app'
import { Livestock } from '../components/Livestock'
import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from '../types'

export const Route = createFileRoute('/livestock')({
  loader: async () =>
    buildLivestockView(
      produce as unknown as ProduceProfile[],
      prices as unknown as PriceSnapshot,
      nutrition as unknown as NutritionSnapshot,
      recipes as unknown as RecipeSnapshot,
      new Date(),
    ),
  component: LivestockPage,
})

function LivestockPage() {
  const view = Route.useLoaderData()
  // date는 로더 직렬화 경계를 넘으며 문자열이 될 수 있어 Date로 되살린다.
  return <Livestock view={{ ...view, date: new Date(view.date) }} />
}
