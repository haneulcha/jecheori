# 카드 정보·가격 표시 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드의 가격을 전단지처럼 또렷하게 바꾸고, 이미 가진 데이터(지난값·작년값·절정·whyNow·단위·분류)를 접힘/펼침 카드에 살려낸다.

**Architecture:** 순수 함수는 `picks.ts`, HTML 조립은 `render.ts`에 작은 렌더 헬퍼로 분리한다. 인터랙션(카드 펼침·필터·툴팁)은 전부 CSS(`<details>`·라디오·`:focus`)로 JS 없이 처리한다. 스타일은 `style.css`에 컴포넌트별로 더하고 DESIGN.md 토큰을 갱신한다.

**Tech Stack:** TypeScript, Vite(정적 빌드), Vitest. 런타임 의존성 0.

## Global Constraints

- 런타임 의존성 0. devDependencies는 typescript/vite/vitest만. (verbatim from CLAUDE.md)
- 런타임 외부요청 0. 인터랙션은 CSS 우선, JS 최소.
- 사용자 문구는 담백한 한국어. 이커머스 화법 금지 ("사세요" ✕).
- 웜 컬러는 배경/칩으로만. 글자·강조는 쪽빛(`--ink`); 등락 의미 마커(`--ink`/`--rise`)만 예외로 글자에 실릴 수 있다.
- 데이터 접근은 `data.ts`로만. UI가 JSON 경로를 직접 알지 않는다.
- 숫자는 `tabular-nums`, `toLocaleString('ko-KR')`.
- 테스트는 Vitest. 실행: `npm test` (전체), 개별은 `npx vitest run <file> -t "<name>"`.

---

### Task 1: PriceView에 지난값·작년값 절댓값 추가

**Files:**
- Modify: `src/picks.ts:3-8` (PriceView), `src/picks.ts:31-38` (priceView)
- Test: `tests/picks.test.ts`

**Interfaces:**
- Produces: `interface PriceView { price: number; unit: string; changeVsMonthAgoPct: number | null; priceMonthAgo: number | null; priceYearAgo: number | null }`

- [ ] **Step 1: Write the failing test** — `tests/picks.test.ts`의 `describe('priceView', ...)`에 추가(없으면 새 describe 생성):

```ts
describe('priceView 절댓값 통과', () => {
  test('지난값·작년값을 그대로 싣는다', () => {
    const v = priceView(entry({ price: 12600, priceMonthAgo: 16900, priceYearAgo: 13400 }))
    expect(v).toEqual({
      price: 12600,
      unit: '1kg',
      changeVsMonthAgoPct: expect.closeTo(-25.44, 1),
      priceMonthAgo: 16900,
      priceYearAgo: 13400,
    })
  })
  test('결측은 null로 통과', () => {
    const v = priceView(entry({ price: 1000, priceMonthAgo: null, priceYearAgo: null }))
    expect(v?.priceMonthAgo).toBeNull()
    expect(v?.priceYearAgo).toBeNull()
    expect(v?.changeVsMonthAgoPct).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/picks.test.ts -t "절댓값"`
Expected: FAIL — `priceMonthAgo` 속성이 결과에 없음.

- [ ] **Step 3: Write minimal implementation** — `src/picks.ts`:

```ts
export interface PriceView {
  price: number
  unit: string
  /** 1개월 전 대비 % (음수 = 하락). 1개월 전 가격이 없으면 null */
  changeVsMonthAgoPct: number | null
  priceMonthAgo: number | null
  priceYearAgo: number | null
}
```

그리고 `priceView` 반환을:

```ts
  return {
    price: entry.price,
    unit: entry.unit,
    changeVsMonthAgoPct: change,
    priceMonthAgo: entry.priceMonthAgo,
    priceYearAgo: entry.priceYearAgo,
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/picks.test.ts`
Expected: PASS (기존 priceView 테스트 포함 전부).

- [ ] **Step 5: Commit**

```bash
git add src/picks.ts tests/picks.test.ts
git commit -m "feat: PriceView에 지난달·작년 절댓값 추가"
```

---

### Task 2: 개당값 순수 함수

**Files:**
- Modify: `src/render.ts` (신규 export 함수)
- Test: `tests/render.test.ts`

**Interfaces:**
- Produces: `perUnitPrice(price: number, unit: string): { each: number } | null` — 단위가 "N개"(N>1)면 `{ each: round(price/N) }`, 단수("1개")·무게(kg/g) 등은 `null`.

- [ ] **Step 1: Write the failing test** — `tests/render.test.ts`:

```ts
import { perUnitPrice } from '../src/render'

describe('perUnitPrice', () => {
  test('10개면 개당값', () => expect(perUnitPrice(18200, '10개')).toEqual({ each: 1820 }))
  test('반올림', () => expect(perUnitPrice(12600, '10개')).toEqual({ each: 1260 }))
  test('1개(단수)는 null', () => expect(perUnitPrice(21400, '1개')).toBeNull())
  test('무게 단위는 null', () => expect(perUnitPrice(8000, '1kg')).toBeNull())
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render.test.ts -t "perUnitPrice"`
Expected: FAIL — `perUnitPrice` is not a function.

- [ ] **Step 3: Write minimal implementation** — `src/render.ts` 상단(escapeHtml 아래)에:

```ts
/** "N개"(N>1) 단위면 개당값을 계산. 단수·무게 단위는 null. */
export function perUnitPrice(price: number, unit: string): { each: number } | null {
  const m = /^(\d+)\s*개$/.exec(unit.trim())
  if (!m) return null
  const count = Number(m[1])
  if (count <= 1) return null
  return { each: Math.round(price / count) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render.test.ts -t "perUnitPrice"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render.ts tests/render.test.ts
git commit -m "feat: 개당값 계산 함수"
```

---

### Task 3: 가격 블록 렌더러 (+ DESIGN 상승색 개정)

**Files:**
- Modify: `src/render.ts` (formatPrice 제거, renderPriceBlock 추가), `src/style.css` (토큰·가격블록 CSS), `DESIGN.md`
- Test: `tests/render.test.ts`

**Interfaces:**
- Consumes: `PriceView`(Task 1), `perUnitPrice`(Task 2)
- Produces: `renderPriceBlock(view: PriceView): string` — 우측 정렬 블록. 취소선 지난값 + 화살표 칩(등락%) + 큰 볼드 가격 + 개당값. 하락은 `.fall`, 상승은 `.rise` 클래스.

- [ ] **Step 1: Write the failing test** — `tests/render.test.ts`. 기존 `describe('formatPrice', ...)` 블록 전체를 아래로 교체:

```ts
import { renderPriceBlock } from '../src/render'

describe('renderPriceBlock', () => {
  const base = { unit: '10개', priceYearAgo: 13400 }
  test('하락: 취소선 지난값 + 칩 % + 큰 가격 + 개당값', () => {
    const html = renderPriceBlock({ ...base, price: 12600, priceMonthAgo: 16900, changeVsMonthAgoPct: -25.4 })
    expect(html).toContain('class="price fall"')
    expect(html).toContain('16,900원') // 취소선 지난값
    expect(html).toContain('12,600')   // 큰 가격
    expect(html).toContain('25%')      // 등락
    expect(html).toContain('개당 1,260원')
  })
  test('상승: rise 클래스', () => {
    const html = renderPriceBlock({ price: 5000, unit: '1kg', priceMonthAgo: 4400, priceYearAgo: 4000, changeVsMonthAgoPct: 13.6 })
    expect(html).toContain('class="price rise"')
    expect(html).not.toContain('개당') // 무게 단위
  })
  test('변동 미미(<1%)는 칩 없이 비슷 문구', () => {
    const html = renderPriceBlock({ price: 5000, unit: '1kg', priceMonthAgo: 5010, priceYearAgo: 5000, changeVsMonthAgoPct: 0.2 })
    expect(html).toContain('비슷')
    expect(html).not.toContain('chip')
  })
  test('지난값 없으면 취소선 생략', () => {
    const html = renderPriceBlock({ price: 5000, unit: '1kg', priceMonthAgo: null, priceYearAgo: null, changeVsMonthAgoPct: null })
    expect(html).not.toContain('was')
    expect(html).toContain('5,000')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render.test.ts -t "renderPriceBlock"`
Expected: FAIL — `renderPriceBlock` is not a function.

- [ ] **Step 3: Write minimal implementation** — `src/render.ts`. `formatPrice`와 그 import 참조를 제거하고 추가:

```ts
const ARROW_DOWN = '<svg class="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M5.5 1 V10 M2 6.5 L5.5 10 L9 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ARROW_UP = '<svg class="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M5.5 11 V2 M2 5.5 L5.5 2 L9 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

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

  return `<div class="price ${dir} num">${was}<span class="nowline">${chip}${big}</span>${perLine}${nearby}</div>`
}
```

- [ ] **Step 4: Run test to verify it passes** — 단, `renderApp`/`renderCard`가 아직 `formatPrice`를 참조하므로 컴파일 에러가 날 수 있다. 이 태스크에서는 `renderCard` 안의 `formatPrice(price)` 호출을 임시로 `renderPriceBlock(price)`로 바꿔 컴파일만 통과시킨다(전면 조립은 Task 7).

Run: `npx vitest run tests/render.test.ts -t "renderPriceBlock"`
Expected: PASS.

- [ ] **Step 5: CSS + DESIGN 토큰 개정** — `src/style.css` `:root`에서 `--rise` 값 교체 + 토큰 추가:

```css
  --rise: #c0392b;      /* 상승 마커 (구 밤색 #8c6a5d에서 개정: 칩 내부 채도 대비) */
  --rise-lo: #efeae3;   /* 상승 칩 저채도 배경 */
```

그리고 `.price { ... }` 규칙 전체를 아래로 교체:

```css
.price { display: flex; flex-direction: column; align-items: flex-end; }
.num { font-variant-numeric: tabular-nums; }
.price .was { color: var(--muted); font-size: 0.85rem; text-decoration: line-through; margin-bottom: 0.18rem; }
.price .nowline { display: flex; align-items: center; gap: 0.4rem; }
.price .big { font-size: 1.7rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
.price .wonu { font-size: 0.95rem; font-weight: 600; }
.price .per { color: var(--muted); font-size: 0.74rem; margin-top: 0.32rem; }
.price .near { color: var(--muted); font-size: 0.78rem; margin-top: 0.2rem; }
.price .chip { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.8rem; font-weight: 700; padding: 0.18rem 0.48rem; border-radius: 1rem; }
.price .arrow { display: block; }
.price.fall .big { color: var(--ink); }
.price.fall .chip { background: var(--tint); color: var(--ink); }
.price.rise .big { color: var(--rise); }
.price.rise .chip { background: var(--rise-lo); color: var(--rise); }
```

`DESIGN.md` "공통" 색 표의 `--rise` 행을 `#C0392B / 러스트 / 가격 상승 마커(칩·큰가격)`로 고치고, `--rise-lo #EFEAE3` 행을 추가. "규율" 문단에 "등락 마커(`--ink`/`--rise`)는 의미 전달로서 글자에 실린다"를 한 줄 추가.

- [ ] **Step 6: Commit**

```bash
git add src/render.ts src/style.css DESIGN.md tests/render.test.ts
git commit -m "feat: 가격 블록 렌더러 + 상승색 러스트로 개정"
```

---

### Task 4: 절정 dot + 툴팁 렌더러

**Files:**
- Modify: `src/render.ts`, `src/style.css`
- Test: `tests/render.test.ts`

**Interfaces:**
- Produces: `renderPeakDot(inPeak: boolean): string` — `inPeak`면 툴팁 버튼, 아니면 `''`.

- [ ] **Step 1: Write the failing test** — `tests/render.test.ts`:

```ts
import { renderPeakDot } from '../src/render'

describe('renderPeakDot', () => {
  test('절정이면 dot + 툴팁', () => {
    const html = renderPeakDot(true)
    expect(html).toContain('class="peak-dot"')
    expect(html).toContain('맛의 절정')
  })
  test('절정 아니면 빈 문자열', () => expect(renderPeakDot(false)).toBe(''))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render.test.ts -t "renderPeakDot"`
Expected: FAIL — not a function.

- [ ] **Step 3: Write minimal implementation** — `src/render.ts`:

```ts
export function renderPeakDot(inPeak: boolean): string {
  if (!inPeak) return ''
  return '<button class="peak-dot" type="button" aria-label="지금이 제철 절정"><b></b><span class="peak-tip">지금이 맛의 절정이에요</span></button>'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render.test.ts -t "renderPeakDot"`
Expected: PASS.

- [ ] **Step 5: CSS** — `src/style.css`에 추가:

```css
.peak-dot { position: relative; width: 0.75rem; height: 0.75rem; padding: 0; border: 0; background: none; cursor: pointer; vertical-align: 0.1rem; }
.peak-dot b { display: block; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px var(--tint); }
.peak-tip { position: absolute; left: 50%; top: 150%; transform: translateX(-50%); background: var(--ink); color: #fff; font-size: 0.72rem; white-space: nowrap; padding: 0.3rem 0.55rem; border-radius: 0.4rem; opacity: 0; pointer-events: none; transition: opacity 0.12s; z-index: 5; }
.peak-dot:hover .peak-tip, .peak-dot:focus .peak-tip { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .peak-tip { transition: none; } }
```

- [ ] **Step 6: Commit**

```bash
git add src/render.ts src/style.css tests/render.test.ts
git commit -m "feat: 절정 dot + 툴팁 (JS 없이 hover/focus)"
```

---

### Task 5: 가격 스파크라인 (기하 + 렌더)

**Files:**
- Modify: `src/render.ts`, `src/style.css`
- Test: `tests/render.test.ts`

**Interfaces:**
- Produces:
  - `sparklineGeometry(v: { yearAgo: number; monthAgo: number; now: number }): { x: number; y: number }[]` — 순서 [작년, 한달전, 지금]. 값 최대→y 24(위), 최소→y 44(아래). 모두 같으면 y 34.
  - `renderSparkline(view: PriceView): string` — 세 값이 모두 있을 때만 SVG, 아니면 `''`.

- [ ] **Step 1: Write the failing test** — `tests/render.test.ts`:

```ts
import { sparklineGeometry, renderSparkline } from '../src/render'

describe('sparklineGeometry', () => {
  test('최댓값은 위(y=24), 최솟값은 아래(y=44)', () => {
    const pts = sparklineGeometry({ yearAgo: 13400, monthAgo: 16900, now: 12600 })
    expect(pts.map((p) => p.x)).toEqual([45, 150, 255])
    expect(pts[1].y).toBeCloseTo(24, 1)  // 한달전 = 최대
    expect(pts[2].y).toBeCloseTo(44, 1)  // 지금 = 최소
    expect(pts[0].y).toBeGreaterThan(pts[1].y) // 작년은 중간
  })
  test('모두 같으면 중앙', () => {
    const pts = sparklineGeometry({ yearAgo: 100, monthAgo: 100, now: 100 })
    expect(pts.every((p) => p.y === 34)).toBe(true)
  })
})

describe('renderSparkline', () => {
  test('세 값 있으면 SVG + 라벨', () => {
    const html = renderSparkline({ price: 12600, unit: '10개', changeVsMonthAgoPct: -25, priceMonthAgo: 16900, priceYearAgo: 13400 })
    expect(html).toContain('<svg')
    expect(html).toContain('작년 이맘때')
    expect(html).toContain('지금')
    expect(html).toContain('12,600')
  })
  test('결측이면 빈 문자열', () => {
    expect(renderSparkline({ price: 12600, unit: '10개', changeVsMonthAgoPct: null, priceMonthAgo: null, priceYearAgo: 13400 })).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render.test.ts -t "sparkline"`
Expected: FAIL — not a function.

- [ ] **Step 3: Write minimal implementation** — `src/render.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render.test.ts -t "sparkline"`
Expected: PASS.

- [ ] **Step 5: CSS** — `src/style.css` `:root`에 `--axis: #cbc2b0;` 추가, 그리고:

```css
.spark { margin: 0 0 1.6rem; }
.spark svg { display: block; width: 100%; height: auto; }
.spark .trend { fill: none; stroke: var(--muted); stroke-width: 1.1; stroke-linejoin: round; opacity: 0.65; }
.spark .axis { stroke: var(--axis); stroke-width: 0.3; }
.spark .pt { fill: var(--card); stroke: var(--muted); stroke-width: 0.8; }
.spark .pt.now { fill: var(--ink); stroke: var(--ink); }
.spark .val, .spark .lab { fill: var(--muted); font-size: 9px; }
.spark .val.now, .spark .lab.now { fill: var(--ink); font-weight: 700; }
```

`DESIGN.md` 색 표에 `--axis #CBC2B0 / 스파크라인 x축` 행 추가.

- [ ] **Step 6: Commit**

```bash
git add src/render.ts src/style.css DESIGN.md tests/render.test.ts
git commit -m "feat: 가격 스파크라인 (작년/한달전/지금)"
```

---

### Task 6: 장보기 노트 렌더러

**Files:**
- Modify: `src/render.ts`, `src/style.css`
- Test: `tests/render.test.ts`

**Interfaces:**
- Consumes: `ProduceProfile`
- Produces: `renderNote(profile: ProduceProfile): string` — 키 고정 너비 정렬 3줄(고르는 법/보관/쓰임).

- [ ] **Step 1: Write the failing test** — `tests/render.test.ts`:

```ts
import { renderNote } from '../src/render'

describe('renderNote', () => {
  test('세 키와 내용을 담는다', () => {
    const html = renderNote(profile) // 파일 상단의 기존 profile 픽스처 재사용
    expect(html).toContain('class="note"')
    expect(html).toContain('고르는 법')
    expect(html).toContain('보관')
    expect(html).toContain('쓰임')
    expect(html).toContain('향이 진한 것')   // howToPick
    expect(html).toContain('실온 후숙')      // howToStore
    expect(html).toContain('그냥 먹기')      // howToUse
  })
  test('내용을 이스케이프한다', () => {
    const html = renderNote({ ...profile, howToPick: '<b>x</b>' })
    expect(html).toContain('&lt;b&gt;')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render.test.ts -t "renderNote"`
Expected: FAIL — not a function.

- [ ] **Step 3: Write minimal implementation** — `src/render.ts`:

```ts
export function renderNote(profile: ProduceProfile): string {
  const row = (label: string, text: string) =>
    `<div class="nrow"><span class="lbl">${label}</span><span>${escapeHtml(text)}</span></div>`
  return `<div class="note">${row('고르는 법', profile.howToPick)}${row('보관', profile.howToStore)}${row('쓰임', profile.howToUse)}</div>`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render.test.ts -t "renderNote"`
Expected: PASS.

- [ ] **Step 5: CSS** — `src/style.css` `:root`에 `--margin: #e3c4b8;` 추가, 그리고 (기존 `.detail` 규칙은 남겨두되 사용 안 함 — Task 7에서 제거):

```css
.note { position: relative; padding-left: 1.1rem; }
.note::before { content: ''; position: absolute; left: 0.3rem; top: 0.1rem; bottom: 0.1rem; width: 1px; background: var(--margin); }
.nrow { display: grid; grid-template-columns: 4rem 1fr; gap: 0.55rem; align-items: baseline; border-bottom: 1px dotted var(--line); padding: 0.42rem 0; font-size: 0.82rem; color: #5a5140; line-height: 1.5; }
.nrow:last-child { border-bottom: none; }
.nrow .lbl { color: var(--ink); font-weight: 700; letter-spacing: 0.02em; }
```

`DESIGN.md` 색 표에 `--margin #E3C4B8 / 장보기 노트 여백선` 행 추가.

- [ ] **Step 6: Commit**

```bash
git add src/render.ts src/style.css DESIGN.md tests/render.test.ts
git commit -m "feat: 장보기 노트 렌더러 (먹지 괘선·키 정렬)"
```

---

### Task 7: 카드 조립 (접힘/펼침) + data-cat

**Files:**
- Modify: `src/render.ts:37-55` (renderCard), `src/style.css` (구 .detail/.badge/.card-title/.why 정리)
- Test: `tests/render.test.ts`

**Interfaces:**
- Consumes: `renderPriceBlock`, `renderPeakDot`, `renderSparkline`, `renderNote`, `whyNowLine`
- Produces: `renderCard(result: PickResult, month: number): string` — `<details class="card" data-cat="…">`, summary=이모지+이름+dot+품종+가격블록, 펼침=whyNow+스파크라인+노트.

- [ ] **Step 1: Write the failing test** — `tests/render.test.ts`의 `describe('renderApp', ...)` 안 테스트를 새 구조에 맞게 갱신:

```ts
  test('픽 카드: 이름·가격블록·data-cat·절정 dot', () => {
    const html = renderApp({ picks, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('복숭아')
    expect(html).toContain('data-cat="fruit"')
    expect(html).toContain('class="price fall')  // 가격 블록
    expect(html).toContain('18,200')
    expect(html).toContain('peak-dot')            // 절정
    expect(html).toContain('여름이 절정이에요')     // whyNow (펼침)
  })
  test('가격이 없으면 가격 블록 없이', () => {
    const html = renderApp({ picks: [{ profile, inPeak: false, price: null }], seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('복숭아')
    expect(html).not.toContain('class="price')
    expect(html).not.toContain('peak-dot')
  })
```

기존의 `expect(html).toContain('제철 한창')`, `'class="sprig"'`(유지), `'소서 · 7월 둘째 주'`, `staleDays` 테스트는 그대로 둔다. `'제철 한창'` 배지 단언은 삭제.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render.test.ts -t "renderApp"`
Expected: FAIL — `data-cat` 없음 / `제철 한창` 잔존 등.

- [ ] **Step 3: Write minimal implementation** — `src/render.ts` `renderCard` 교체:

```ts
function renderCard(result: PickResult, month: number): string {
  const { profile, inPeak, price } = result
  const priceBlock = price ? renderPriceBlock(price) : ''
  const spark = price ? renderSparkline(price) : ''
  return `
<details class="card" data-cat="${profile.category}">
  <summary>
    <span class="id">
      <span class="emoji">${profile.emoji}</span>
      <span>
        <span class="card-title">${escapeHtml(profile.name)}${renderPeakDot(inPeak)}</span>
        <span class="kind">${escapeHtml(profile.kamis.kindName ?? '')}</span>
      </span>
    </span>
    ${priceBlock}
  </summary>
  <div class="open">
    <p class="why">${escapeHtml(whyNowLine(profile, month))}</p>
    ${spark}
    ${renderNote(profile)}
  </div>
</details>`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render.test.ts`
Expected: PASS (전체 render 테스트).

- [ ] **Step 5: CSS 정리** — `src/style.css`에서 구 `.card-title`/`.badge`/`.badge-peak`/`.why`/`.price(구)`/`.detail*` 중 더 이상 안 쓰는 규칙 제거하고, 카드 레이아웃 추가:

```css
.card summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.9rem; }
.card .id { display: flex; align-items: center; gap: 0.6rem; }
.card .emoji { font-size: 1.7rem; line-height: 1; }
.card-title { font-size: 1.05rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.45rem; }
.card .kind { display: block; color: var(--muted); font-size: 0.78rem; margin-top: 0.1rem; }
.open { border-top: 1px solid var(--line); margin-top: 0.85rem; padding-top: 0.85rem; }
.open .why { color: var(--ink); font-size: 0.9rem; margin: 0 0 0.9rem; }
```

- [ ] **Step 6: Commit**

```bash
git add src/render.ts src/style.css tests/render.test.ts
git commit -m "feat: 카드 접힘/펼침 조립 + data-cat"
```

---

### Task 8: 과일/채소 필터 토글 (CSS-only)

**Files:**
- Modify: `src/render.ts` (renderApp), `src/style.css`
- Test: `tests/render.test.ts`

**Interfaces:**
- Produces: renderApp의 `.picks` 안에 라디오 3개(`f-all`/`f-fruit`/`f-veg`) + `.filter` 라벨 + `.list`(카드들). 픽이 있을 때만.

- [ ] **Step 1: Write the failing test** — `tests/render.test.ts`:

```ts
  test('픽이 있으면 과일/채소 필터 토글', () => {
    const html = renderApp({ picks, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('id="f-all"')
    expect(html).toContain('id="f-fruit"')
    expect(html).toContain('id="f-veg"')
    expect(html).toContain('class="list"')
  })
  test('픽이 없으면 필터 없음', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).not.toContain('id="f-fruit"')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render.test.ts -t "필터"`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation** — `src/render.ts` `renderApp`의 `cards` 조립 부분을 교체:

```ts
  const filterAndList =
    picks.length > 0
      ? `<input type="radio" name="cat-filter" id="f-all" checked><input type="radio" name="cat-filter" id="f-fruit"><input type="radio" name="cat-filter" id="f-veg">
<div class="filter"><label for="f-all">전체</label><label for="f-fruit">과일</label><label for="f-veg">채소</label></div>
<div class="list">${picks.map((p) => renderCard(p, month)).join('\n')}</div>`
      : '<p class="empty">이번 달 제철 정보가 아직 없어요</p>'
```

그리고 `<section class="picks">${cards}</section>` → `<section class="picks">${filterAndList}</section>` (기존 `cards` 변수 제거).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render.test.ts`
Expected: PASS.

- [ ] **Step 5: CSS** — `src/style.css`:

```css
.picks input[name='cat-filter'] { position: absolute; opacity: 0; pointer-events: none; }
.filter { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
.filter label { font-size: 0.85rem; padding: 0.32rem 0.8rem; border-radius: 1rem; cursor: pointer; border: 1px solid var(--line); color: var(--muted); user-select: none; }
#f-all:checked ~ .filter label[for='f-all'],
#f-fruit:checked ~ .filter label[for='f-fruit'],
#f-veg:checked ~ .filter label[for='f-veg'] { background: var(--tint); color: var(--ink); border-color: var(--tint); font-weight: 600; }
#f-fruit:checked ~ .list .card[data-cat='vegetable'],
#f-veg:checked ~ .list .card[data-cat='fruit'] { display: none; }
```

- [ ] **Step 6: Commit**

```bash
git add src/render.ts src/style.css tests/render.test.ts
git commit -m "feat: 과일/채소 CSS 필터 토글"
```

---

### Task 9: 정직한 빈 상태 + "곧 제철" 예고

**Files:**
- Modify: `src/picks.ts` (comingSoon, hasDrops), `src/render.ts` (renderApp, AppView), `src/main.ts`
- Test: `tests/picks.test.ts`, `tests/render.test.ts`

**Interfaces:**
- Produces:
  - `comingSoon(profiles: ProduceProfile[], month: number): ProduceProfile[]` — 다음 달 새로 철 드는 품목.
  - `hasDrops(picks: PickResult[]): boolean` — 하락 픽이 하나라도 있는지.
  - `AppView`에 `coming?: ProduceProfile[]` 추가.

- [ ] **Step 1: Write the failing test** — `tests/picks.test.ts`:

```ts
import { comingSoon, hasDrops } from '../src/picks'

describe('comingSoon', () => {
  test('다음 달에 새로 드는 품목만', () => {
    const p1 = profile({ id: 'a', seasonMonths: [7, 8] })   // 7월에도 제철 → 제외
    const p2 = profile({ id: 'b', seasonMonths: [8, 9] })   // 8월 신규 → 포함
    expect(comingSoon([p1, p2], 7).map((p) => p.id)).toEqual(['b'])
  })
  test('12월의 다음은 1월', () => {
    const p = profile({ id: 'c', seasonMonths: [1] })
    expect(comingSoon([p], 12).map((p) => p.id)).toEqual(['c'])
  })
})

describe('hasDrops', () => {
  const mk = (pct: number | null) => ({ profile: profile({}), inPeak: false, price: { price: 1, unit: '1kg', changeVsMonthAgoPct: pct, priceMonthAgo: 1, priceYearAgo: 1 } })
  test('하락이 있으면 true', () => expect(hasDrops([mk(-5)])).toBe(true))
  test('전부 상승/무변동이면 false', () => expect(hasDrops([mk(3), mk(null)])).toBe(false))
})
```

`tests/render.test.ts`:

```ts
  test('픽은 있으나 하락이 없으면 담백한 안내', () => {
    const flat = [{ profile, inPeak: true, price: { price: 5000, unit: '1kg', changeVsMonthAgoPct: 2, priceMonthAgo: 4900, priceYearAgo: 5000 } }]
    const html = renderApp({ picks: flat, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('크게 내려온 게 없어요')
  })
  test('곧 제철 예고', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0, coming: [{ ...profile, name: '포도', emoji: '🍇' }] })
    expect(html).toContain('곧 제철')
    expect(html).toContain('포도')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/picks.test.ts tests/render.test.ts -t "comingSoon|hasDrops|담백|곧 제철"`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation** — `src/picks.ts`:

```ts
export function comingSoon(profiles: ProduceProfile[], month: number): ProduceProfile[] {
  const next = month === 12 ? 1 : month + 1
  return profiles.filter((p) => p.seasonMonths.includes(next) && !p.seasonMonths.includes(month))
}

export function hasDrops(picks: PickResult[]): boolean {
  return picks.some((p) => p.price != null && p.price.changeVsMonthAgoPct != null && p.price.changeVsMonthAgoPct < 0)
}
```

`src/render.ts` — `AppView`에 `coming?: ProduceProfile[]` 추가하고 `renderApp`에서 구조분해에 `coming = []` 추가. 하락 안내는 `.picks` 안 `.list` 위(필터 아래)에 조건부 삽입:

```ts
import { hasDrops, whyNowLine } from './picks'
// ...renderApp 내부, filterAndList 만들기 직전:
  const noDrop = picks.length > 0 && !hasDrops(picks)
    ? '<p class="nodrop">이번 주는 크게 내려온 게 없어요. 제철은 그대로 곁에 있어요.</p>'
    : ''
```

그리고 `.list` 앞에 `${noDrop}` 삽입. 하단 seasonal 섹션 뒤에 곧 제철 한 줄:

```ts
  const comingLine = coming.length > 0
    ? `<p class="coming"><span>곧 제철</span> · ${coming.map((p) => `${p.emoji} ${escapeHtml(p.name)}`).join(' · ')}</p>`
    : ''
```

`</section>`(seasonal) 다음, `</main>` 전에 `${comingLine}` 삽입.

`src/main.ts` — `comingSoon` import 추가하고 `renderApp` 인자에 `coming: comingSoon(profiles, now.getMonth() + 1)` 추가:

```ts
import { comingSoon, seasonalThisMonth, selectPicks } from './picks'
// ...
      coming: comingSoon(profiles, now.getMonth() + 1),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (전체).

- [ ] **Step 5: CSS** — `src/style.css`:

```css
.nodrop { color: var(--muted); font-size: 0.88rem; margin: 0 0 1rem; }
.coming { margin-top: 1rem; color: var(--muted); font-size: 0.85rem; }
.coming span { color: var(--ink); font-weight: 600; }
```

- [ ] **Step 6: Commit**

```bash
git add src/picks.ts src/render.ts src/main.ts src/style.css tests/picks.test.ts tests/render.test.ts
git commit -m "feat: 정직한 빈 상태 + 곧 제철 예고"
```

---

### Task 10: 통합 검증 + 실제 앱 확인

**Files:**
- Verify only: 전체

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: PASS (모든 파일). 실패 시 해당 태스크로 돌아가 수정.

- [ ] **Step 2: 타입·빌드**

Run: `npx tsc --noEmit && npm run build`
Expected: 타입 에러 0, `dist/` 생성 성공.

- [ ] **Step 3: 실제 앱 확인** — `/run` 스킬 또는 `npm run dev` 후 http://localhost:5173/ 에서 육안 확인:
  - 카드 접힘: 이모지·이름·(절정 dot)·품종 / 우측 취소선 지난값·칩·큰 볼드 가격·개당값
  - 절정 dot hover/클릭 시 툴팁
  - 카드 펼침: whyNow → 스파크라인(값 점 위, 가는 x축) → 먹지 괘선 노트(키 정렬)
  - 상단 전체/과일/채소 클릭 시 필터
  - 하락 없을 때 안내 문구, 하단 "곧 제철"
  - 상승 품목이 있으면 러스트 칩/가격

- [ ] **Step 4: 접근성·모션 스팟체크** — `prefers-reduced-motion: reduce`에서 툴팁/카드 전환이 꺼지는지, 웜 배경 위 글자가 쪽빛/러스트로 대비 유지되는지.

- [ ] **Step 5: DESIGN.md 최종 확인** — `--rise`(러스트)·`--rise-lo`·`--margin`·`--axis` 반영, "카드 안 일러스트 없음" 항목에 "정보 그래픽(가격·칩·스파크라인·필터)은 허용" 한 줄 있는지.

- [ ] **Step 6: Commit (필요 시)**

```bash
git add -A
git commit -m "chore: 카드 개편 통합 검증"
```

---

## Self-Review

**1. Spec coverage:**
- 원안-1 과일/채소 필터 → Task 8 ✓ · 원안-2 이모지 유지 → Task 7(그대로) ✓ · 원안-3 볼드 가격 → Task 3 ✓ · 원안-4 지난값+화살표 → Task 3 ✓
- 제안-1 작년 대비 → Task 5(스파크라인) ✓ · 제안-2 절정 dot → Task 4 ✓ · 제안-3 whyNow → Task 7(펼침) ✓ · 제안-4 개당값 → Task 2·3 ✓ · 제안-5 빈 상태 → Task 9 ✓ · 제안-6 곧 제철 → Task 9 ✓
- 데이터/타입 변경(PriceView) → Task 1 ✓ · DESIGN.md 토큰 → Task 3/5/6/10 ✓

**2. Placeholder scan:** 모든 스텝에 실제 코드/명령/기대값 포함. "적절히 처리" 류 없음.

**3. Type consistency:** `PriceView`(price,unit,changeVsMonthAgoPct,priceMonthAgo,priceYearAgo)는 Task 1에서 정의, Task 3·5에서 동일 필드 사용. `renderPriceBlock/renderSparkline/renderPeakDot/renderNote` 시그니처가 Task 7 조립에서 쓰는 것과 일치. `comingSoon/hasDrops`(Task 9)가 main.ts/renderApp에서 쓰는 것과 일치.

## Execution Handoff

(아래 실행 방식은 대화에서 선택)
