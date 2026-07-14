import type { Unit } from '../src/types'

/** 테스트용 단위 리터럴. "10개" → count 10, "1kg" → weight 1. */
export const count = (quantity: number, unit: '개' | '포기' = '개'): Unit => ({
  quantity,
  measure: { kind: 'count', unit },
})

export const weight = (quantity: number, unit: 'kg' | 'g' = 'kg'): Unit => ({
  quantity,
  measure: { kind: 'weight', unit },
})
