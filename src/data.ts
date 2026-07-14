import type { PriceSnapshot, ProduceProfile } from './types'

// import.meta.env는 Vite 밖(vitest node 환경)에서도 안전하도록 폴백
const BASE: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'

export async function loadProfiles(): Promise<ProduceProfile[]> {
  const res = await fetch(`${BASE}data/produce.json`)
  if (!res.ok) throw new Error(`제철 프로필을 불러오지 못했어요 (${res.status})`)
  return res.json()
}

export async function loadSnapshot(): Promise<PriceSnapshot | null> {
  try {
    const res = await fetch(`${BASE}data/prices.json`)
    if (!res.ok) return null
    return (await res.json()) as PriceSnapshot
  } catch {
    return null
  }
}

/** 가격의 신선도 — 조사일 KST 자정을 기준으로 잰다.
 *  fetchedAt으로 재면 cron이 매일 도는 한 항상 0이라, 일주일 묵은 가격도 오늘 것처럼 보인다. */
export function snapshotAgeDays(snapshot: PriceSnapshot, now: Date): number {
  const surveyedAt = new Date(`${snapshot.surveyedOn}T00:00:00+09:00`)
  const ms = now.getTime() - surveyedAt.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}
