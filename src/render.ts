import type { CardView, NoteView, PriceCardView, SparkView } from './card'

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

const ARROW_DOWN = '<svg class="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M5.5 1 V10 M2 6.5 L5.5 10 L9 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ARROW_UP = '<svg class="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M5.5 11 V2 M2 5.5 L5.5 2 L9 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function renderSparkline(s: SparkView): string {
  const [yr, mo, now] = s.points
  const n = (x: number) => x.toLocaleString('ko-KR')
  const label = `가격 추이: 작년 이맘때 ${n(s.yearAgo)} · 한 달 전 ${n(s.monthAgo)} · 지금 ${n(s.now)}`
  return `<div class="spark num"><svg viewBox="0 0 300 72" role="img" aria-label="${label}">
    <polyline class="trend" points="${yr.x},${yr.y.toFixed(1)} ${mo.x},${mo.y.toFixed(1)} ${now.x},${now.y.toFixed(1)}"/>
    <text class="val" x="${yr.x}" y="${(yr.y - 8).toFixed(1)}" text-anchor="middle">${n(s.yearAgo)}</text>
    <text class="val" x="${mo.x}" y="${(mo.y - 8).toFixed(1)}" text-anchor="middle">${n(s.monthAgo)}</text>
    <text class="val now" x="${now.x}" y="${(now.y - 8).toFixed(1)}" text-anchor="middle">${n(s.now)}</text>
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

export function renderNote(note: NoteView): string {
  const row = (label: string, text: string) =>
    `<div class="nrow"><span class="lbl">${label}</span><span>${escapeHtml(text)}</span></div>`
  return `<div class="note">${row('고르는 법', note.pick)}${row('보관', note.store)}${row('쓰임', note.use)}</div>`
}

export function renderPriceBlock(p: PriceCardView): string {
  const perLine = p.perUnit !== null ? `<span class="per num">개당 ${won(p.perUnit)}</span>` : ''
  const was = p.wasMonthAgo !== null ? `<span class="was num">${won(p.wasMonthAgo)}</span>` : ''
  const dir = p.change?.kind === 'rise' ? 'rise' : 'fall'
  let chip = ''
  if (p.change && (p.change.kind === 'fall' || p.change.kind === 'rise')) {
    const arrow = p.change.kind === 'fall' ? ARROW_DOWN : ARROW_UP
    chip = `<span class="chip">${arrow}${p.change.pct}%</span>`
  }
  const big = `<span class="big num">${p.now.toLocaleString('ko-KR')}<span class="wonu">원</span></span>`
  const nearby = p.change?.kind === 'similar' ? '<span class="near">한 달 전과 비슷해요</span>' : ''

  return `<div class="price ${dir}">${was}<span class="nowline">${chip}${big}</span>${perLine}${nearby}</div>`
}

function renderCard(card: CardView): string {
  const priceBlock = card.price ? renderPriceBlock(card.price) : ''
  const spark = card.price?.spark ? renderSparkline(card.price.spark) : ''
  return `
<details class="card" data-cat="${card.category}">
  <summary>
    <span class="id">
      <span class="emoji">${card.emoji}</span>
      <span>
        <span class="card-title">${escapeHtml(card.name)}${renderPeakDot(card.inPeak)}</span>
        <span class="kind">${escapeHtml(card.kind)}</span>
      </span>
    </span>
    ${priceBlock}
  </summary>
  <div class="open">
    <p class="why">${escapeHtml(card.whyNow)}</p>
    ${spark}
    ${renderNote(card.note)}
  </div>
</details>`
}

/** 이모지+이름 칩 하나 (제철 리스트·곧 제철 예고용) */
export interface Chip {
  emoji: string
  name: string
}

export interface AppView {
  cards: CardView[]
  /** 픽은 있으나 하락이 없을 때 담백한 안내를 보인다 */
  noDrop: boolean
  seasonal: Chip[]
  coming: Chip[]
  date: Date
  staleDays: number
  /** 현재 절기 이름 — 있으면 아이브로에 "소서 · 7월 둘째 주"로 표기 */
  term?: string
}

export function renderApp({ cards, noDrop, seasonal, coming, date, staleDays, term }: AppView): string {
  const month = date.getMonth() + 1
  const stale =
    staleDays >= 3 ? `<p class="stale">가격은 ${staleDays}일 전 기준이에요</p>` : ''
  const noDropLine = noDrop
    ? '<p class="nodrop">이번 주는 크게 내려온 게 없어요. 제철은 그대로 곁에 있어요.</p>'
    : ''
  const filterAndList =
    cards.length > 0
      ? `<input type="radio" name="cat-filter" id="f-all" checked><input type="radio" name="cat-filter" id="f-fruit"><input type="radio" name="cat-filter" id="f-veg">
<div class="filter"><label for="f-all">전체</label><label for="f-fruit">과일</label><label for="f-veg">채소</label></div>
${noDropLine}<div class="list">${cards.map(renderCard).join('\n')}</div>`
      : '<p class="empty">이번 달 제철 정보가 아직 없어요</p>'
  const seasonalList = seasonal
    .map((c) => `<li>${c.emoji} ${escapeHtml(c.name)}</li>`)
    .join('')
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  const comingLine = coming.length > 0
    ? `<p class="coming"><span>곧 제철</span> · ${coming.map((c) => `${c.emoji} ${escapeHtml(c.name)}`).join(' · ')}</p>`
    : ''
  return `
<header>
  ${SPRIG}
  <p class="week">${escapeHtml(eyebrow)}</p>
  <h1>지금 장바구니에 담기 좋은 것들</h1>
  ${stale}
</header>
<main>
  <section class="picks">${filterAndList}</section>
  <section class="seasonal">
    <h2>${month}월의 제철</h2>
    <ul>${seasonalList}</ul>
  </section>
  ${comingLine}
</main>
<footer>
  <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
</footer>`
}
