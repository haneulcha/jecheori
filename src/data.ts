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

export function snapshotAgeDays(snapshot: PriceSnapshot, now: Date): number {
  const ms = now.getTime() - new Date(snapshot.fetchedAt).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}
