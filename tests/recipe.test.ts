import { describe, expect, test } from 'vitest'
import { matchRecipes, recipeView } from '../src/recipe'
import type { RecipeSnapshot, ProduceProfile } from '../src/types'

const snapshot: RecipeSnapshot = {
  schemaVersion: 1,
  fetchedAt: '2026-07-11T00:00:00.000Z',
  entries: [
    { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다', '볶는다'] },
    { name: '토마토스파게티', ingredients: '토마토, 면', steps: ['삶는다'] },
  ],
}
const tomato = { name: '토마토', recipeRef: { names: ['토마토스파게티', '토마토달걀볶음'] } } as ProduceProfile
const potato = { name: '감자' } as ProduceProfile

describe('matchRecipes', () => {
  test('recipeRef.names 순서대로 엔트리를 고른다', () => {
    expect(matchRecipes(tomato, snapshot).map((e) => e.name)).toEqual(['토마토스파게티', '토마토달걀볶음'])
  })
  test('recipeRef 없으면 빈 배열', () => expect(matchRecipes(potato, snapshot)).toEqual([]))
  test('스냅샷 null이면 빈 배열', () => expect(matchRecipes(tomato, null)).toEqual([]))
  test('스냅샷에 없는 이름은 제외', () => {
    const ref = { name: '토마토', recipeRef: { names: ['없는요리', '토마토달걀볶음'] } } as ProduceProfile
    expect(matchRecipes(ref, snapshot).map((e) => e.name)).toEqual(['토마토달걀볶음'])
  })
})

describe('recipeView', () => {
  test('비어있지 않으면 그대로', () => {
    const es = snapshot.entries
    expect(recipeView(es)).toBe(es)
  })
  test('빈 배열이면 null', () => expect(recipeView([])).toBeNull())
})
