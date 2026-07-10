import type { PickResult, PriceView } from './picks'
import { whyNowLine } from './picks'
import type { ProduceProfile } from './types'

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** "N개"(N>1) 단위면 개당값을 계산. 단수·무게 단위는 null. */
export function perUnitPrice(price: number, unit: string): { each: number } | null {
  const m = /^(\d+)\s*개$/.exec(unit.trim())
  if (!m) return null
  const count = Number(m[1])
  if (count <= 1) return null
  return { each: Math.round(price / count) }
}

const SPRIG = `<svg class="sprig" viewBox="0 0 120 120" fill="none" aria-hidden="true">
  <path d="M20 110 C 45 85, 70 55, 98 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M46 82 C 38 68, 40 58, 52 50 C 56 62, 54 72, 46 82 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M64 60 C 74 46, 86 42, 98 46 C 92 58, 80 64, 64 60 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M34 96 C 26 88, 24 78, 30 70 C 38 76, 40 88, 34 96 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="98" cy="18" r="4" stroke="currentColor" stroke-width="1.5"/>
</svg>`

export function weekLabel(date: Date): string {
  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const idx = Math.min(Math.ceil(date.getDate() / 7), ordinals.length) - 1
  return `${date.getMonth() + 1}월 ${ordinals[idx]} 주`
}

export function formatPrice(view: PriceView): string {
  const won = `${view.price.toLocaleString('ko-KR')}원/${view.unit}`
  const pct = view.changeVsMonthAgoPct
  if (pct === null) return won
  const rounded = Math.round(Math.abs(pct))
  if (Math.abs(pct) < 1) return `${won} · 한 달 전과 비슷해요`
  return pct < 0 ? `${won} · 한 달 전보다 ${rounded}% ↓` : `${won} · 한 달 전보다 ${rounded}% ↑`
}

const ARROW_DOWN = '<svg class="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M5.5 1 V10 M2 6.5 L5.5 10 L9 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ARROW_UP = '<svg class="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M5.5 11 V2 M2 5.5 L5.5 2 L9 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

const SPARK_X = [45, 150, 255]

export function sparklineGeometry(v: { yearAgo: number; monthAgo: number; now: number }): { x: number; y: number }[] {
  const vals = [v.yearAgo, v.monthAgo, v.now]
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min
  return vals.map((val, i) => ({
    x: SPARK_X[i],
    y: span === 0 ? 34 : 44 - ((val - min) / span) * 20,
  }))
}

export function renderSparkline(view: PriceView): string {
  const { price, priceMonthAgo, priceYearAgo } = view
  if (priceMonthAgo === null || priceYearAgo === null) return ''
  const [yr, mo, now] = sparklineGeometry({ yearAgo: priceYearAgo, monthAgo: priceMonthAgo, now: price })
  const n = (x: number) => x.toLocaleString('ko-KR')
  const label = `가격 추이: 작년 이맘때 ${n(priceYearAgo)} · 한 달 전 ${n(priceMonthAgo)} · 지금 ${n(price)}`
  return `<div class="spark num"><svg viewBox="0 0 300 72" role="img" aria-label="${label}">
    <polyline class="trend" points="${yr.x},${yr.y.toFixed(1)} ${mo.x},${mo.y.toFixed(1)} ${now.x},${now.y.toFixed(1)}"/>
    <text class="val" x="${yr.x}" y="${(yr.y - 8).toFixed(1)}" text-anchor="middle">${n(priceYearAgo)}</text>
    <text class="val" x="${mo.x}" y="${(mo.y - 8).toFixed(1)}" text-anchor="middle">${n(priceMonthAgo)}</text>
    <text class="val now" x="${now.x}" y="${(now.y - 8).toFixed(1)}" text-anchor="middle">${n(price)}</text>
    <circle class="pt" cx="${yr.x}" cy="${yr.y.toFixed(1)}" r="1.9"/>
    <circle class="pt" cx="${mo.x}" cy="${mo.y.toFixed(1)}" r="1.9"/>
    <circle class="pt now" cx="${now.x}" cy="${now.y.toFixed(1)}" r="2.3"/>
    <line class="axis" x1="8" y1="54" x2="292" y2="54"/>
    <text class="lab" x="45" y="69" text-anchor="middle">작년 이맘때</text>
    <text class="lab" x="150" y="69" text-anchor="middle">한 달 전</text>
    <text class="lab now" x="255" y="69" text-anchor="middle">지금</text>
  </svg></div>`
}

export function renderPeakDot(inPeak: boolean): string {
  if (!inPeak) return ''
  return '<button class="peak-dot" type="button" aria-label="지금이 제철 절정"><b></b><span class="peak-tip">지금이 맛의 절정이에요</span></button>'
}

export function renderNote(profile: ProduceProfile): string {
  const row = (label: string, text: string) =>
    `<div class="nrow"><span class="lbl">${label}</span><span>${escapeHtml(text)}</span></div>`
  return `<div class="note">${row('고르는 법', profile.howToPick)}${row('보관', profile.howToStore)}${row('쓰임', profile.howToUse)}</div>`
}

export function renderPriceBlock(view: PriceView): string {
  const { price, unit, priceMonthAgo, changeVsMonthAgoPct: pct } = view
  const per = perUnitPrice(price, unit)
  const perLine = per ? `<span class="per num">개당 ${won(per.each)}</span>` : ''
  const was = priceMonthAgo !== null ? `<span class="was num">${won(priceMonthAgo)}</span>` : ''

  let dir = 'fall'
  let chip = ''
  if (pct !== null && Math.abs(pct) >= 1) {
    dir = pct < 0 ? 'fall' : 'rise'
    const arrow = pct < 0 ? ARROW_DOWN : ARROW_UP
    chip = `<span class="chip">${arrow}${Math.round(Math.abs(pct))}%</span>`
  }
  const big = `<span class="big num">${price.toLocaleString('ko-KR')}<span class="wonu">원</span></span>`
  const nearby = pct !== null && Math.abs(pct) < 1 ? '<span class="near">한 달 전과 비슷해요</span>' : ''

  return `<div class="price ${dir}">${was}<span class="nowline">${chip}${big}</span>${perLine}${nearby}</div>`
}

function renderCard(result: PickResult, month: number): string {
  const { profile, inPeak, price } = result
  const badge = inPeak ? '<span class="badge badge-peak">제철 한창</span>' : '<span class="badge">제철</span>'
  // summary 안에는 블록 요소(<p>)가 유효하지 않아 span + display:block 사용
  const priceLine = price ? `<span class="price">${escapeHtml(formatPrice(price))}</span>` : ''
  return `
<details class="card">
  <summary>
    <span class="card-title">${profile.emoji} ${escapeHtml(profile.name)} ${badge}</span>
    <span class="why">${escapeHtml(whyNowLine(profile, month))}</span>
    ${priceLine}
  </summary>
  <dl class="detail">
    <dt>고르는 법</dt><dd>${escapeHtml(profile.howToPick)}</dd>
    <dt>보관법</dt><dd>${escapeHtml(profile.howToStore)}</dd>
    <dt>이렇게 먹어요</dt><dd>${escapeHtml(profile.howToUse)}</dd>
  </dl>
</details>`
}

export interface AppView {
  picks: PickResult[]
  seasonal: ProduceProfile[]
  date: Date
  staleDays: number
  /** 현재 절기 이름 — 있으면 아이브로에 "소서 · 7월 둘째 주"로 표기 */
  term?: string
}

export function renderApp({ picks, seasonal, date, staleDays, term }: AppView): string {
  const month = date.getMonth() + 1
  const stale =
    staleDays >= 3 ? `<p class="stale">가격은 ${staleDays}일 전 기준이에요</p>` : ''
  const cards =
    picks.length > 0
      ? picks.map((p) => renderCard(p, month)).join('\n')
      : '<p class="empty">이번 달 제철 정보가 아직 없어요</p>'
  const seasonalList = seasonal
    .map((p) => `<li>${p.emoji} ${escapeHtml(p.name)}</li>`)
    .join('')
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return `
<header>
  ${SPRIG}
  <p class="week">${escapeHtml(eyebrow)}</p>
  <h1>지금 장바구니에 담기 좋은 것들</h1>
  ${stale}
</header>
<main>
  <section class="picks">${cards}</section>
  <section class="seasonal">
    <h2>${month}월의 제철</h2>
    <ul>${seasonalList}</ul>
  </section>
</main>
<footer>
  <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
</footer>`
}
