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
}

export function renderApp({ picks, seasonal, date, staleDays }: AppView): string {
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
  return `
<header>
  <p class="week">${escapeHtml(weekLabel(date))}</p>
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
