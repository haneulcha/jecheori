# TanStack Start 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** jecheori의 뷰 계층을 TanStack Start(React)로 이식하되 동작·비주얼·정적 배포를 보존한다 (포팅-온리, 계정·개인화는 비범위).

**Architecture:** 프레임워크 무관 순수 모듈(`types`/`picks`/`card`/`app`/`season`)은 그대로 이식하고, `render.ts`(HTML 문자열)를 JSX 컴포넌트로, `main.ts`를 TanStack Router 라우트+로더로 대체한다. 공개 라우트는 로더가 CI 커밋 JSON을 읽어 `buildAppView`를 호출하고, 결과를 정적 프리렌더한다. 인터랙션은 CSS 우선(절정 dot만 client).

**Tech Stack:** TanStack Start (alpha), React 19, TypeScript, Vite, Vitest, @testing-library/react.

## Global Constraints

- **범위: 포팅-온리.** 계정·로그인·개인화·서버 함수 실사용·서버 배포는 짓지 않는다 (다음 사이클).
- **정적 유지.** 공개 라우트를 프리렌더 → 정적 호스트. 런타임 KAMIS 호출 없음 (가격은 `public/data/*.json`, CI 커밋).
- **순수 로직 보존.** `src/{types,picks,card,app,season}.ts`와 그 테스트는 내용 변경 없이 이식. 회귀 가드.
- **CSS 우선 인터랙션.** `<details>`·라디오+CSS 필터는 무JS. 절정 dot 탭 토글만 client.
- **비주얼 보존.** `src/style.css`·DESIGN.md 토큰·클래스명 그대로 재사용.
- 사용자 문구는 담백한 한국어. 이커머스 화법 금지. 공개 페이지 무추적·경량.
- **React는 자동 이스케이프**하므로 컴포넌트에서 `escapeHtml` 불필요(텍스트 자식).
- 숫자는 `toLocaleString('ko-KR')`, `tabular-nums`(`.num`).
- **TanStack Start는 alpha** — 스캐폴드·라우트·로더·프리렌더·배포 설정의 정확한 API는
  **작업 중 현재 문서로 검증**한다: context7 `resolve-library-id "TanStack Start"` →
  `/websites/tanstack_start` 에 `query-docs`. 추측 금지, 검증.
- 테스트 실행: `npm test`(vitest). 개별 `npx vitest run <file>`.

---

### Task 1: 스캐폴드 + 프리렌더 스파이크 (착수 게이트)

**목적:** TanStack Start 앱을 세우고, "라우트 로더가 JSON을 읽어 정적 프리렌더 → 순수
정적 HTML"이 매끄러운지 **먼저 증명**한다. 여기서 프레임워크의 실제 관례(스캐폴드 명령·
라우트 파일 위치·로더 시그니처·프리렌더 설정·빌드 산출물 경로)를 확정해 이후 태스크의
기반으로 삼는다. **막히면 STOP + 보고**(스펙 리스크 절).

**Files:**
- Create: 새 TanStack Start 프로젝트 골격 (스캐폴더 산출). 기존 `src/`·`public/`·`tests/`는 보존.
- Create: `docs/superpowers/notes/tanstack-scaffold.md` — 확정된 관례 기록(명령·경로·시그니처).

**Interfaces:**
- Produces: 확정된 (a) 라우트 파일 경로·`createFileRoute` 사용법, (b) 로더에서
  `public/data/*.json`을 읽는 방법, (c) 프리렌더 빌드 명령·정적 산출물 경로. 후속 태스크가 참조.

- [ ] **Step 1: 현재 문서 확인** — context7로 스캐폴드·프리렌더·로더 API 조회:
  - `resolve-library-id "TanStack Start"` → `/websites/tanstack_start`
  - `query-docs`: "project setup / scaffolding create command", "route loader data fetching", "prerendering static site generation config", "reading local files or public assets in a loader".
  기존 프로젝트에 얹을지(권장) 새로 만들지 판단. 확정 사항을 `tanstack-scaffold.md`에 기록.

- [ ] **Step 2: 앱 골격 생성** — 공식 스캐폴더(TanStack CLI / create 명령, 문서 확인값)로
  최소 TanStack Start 앱을 만든다. 기존 `src/style.css`·`public/data/*.json`·순수 모듈은
  삭제하지 않는다. `package.json`에 React·TanStack Start 런타임 의존성이 추가됨을 확인.

- [ ] **Step 3: 스파이크 라우트** — `/`에 임시 라우트를 만들어 **로더에서 `produce.json`을
  읽어** 품목 개수를 서버/프리렌더 시점에 계산하고 페이지에 출력한다(예: "제철 프로필 N종").

- [ ] **Step 4: 프리렌더 검증** — 프로덕션 빌드를 돌려 **정적 HTML 산출물**에 그 숫자가
  박혀 있는지 확인(브라우저 JS 없이도 보이는지). 산출물 경로·명령을 기록.

Run: (문서에서 확인한 빌드 명령, 예) `npm run build`
Expected: 정적 산출물에 로더 데이터가 프리렌더됨. 안 되면 STOP + 보고.

- [ ] **Step 5: 기존 순수 테스트 생존 확인**

Run: `npx vitest run tests/card.test.ts tests/picks.test.ts tests/app.test.ts tests/season.test.ts`
Expected: PASS (순수 모듈은 아직 그대로).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(spike): TanStack Start 스캐폴드 + JSON 로더 프리렌더 검증"
```

---

### Task 2: 순수 모듈 이식 확정 + Vitest 정합

**목적:** 순수 모듈이 새 구조에서 그대로 살아있고 테스트가 도는지 확정. (Task 1에서 경로가
바뀌었다면 여기서 정리.)

**Files:**
- Keep/Move: `src/{types,picks,card,app,season}.ts` (내용 불변)
- Keep/Move: `tests/{card,picks,app,season,produce,data,parse-kamis,fetch-prices}.test.*`
- Modify: vitest 설정 — 환경 `jsdom` 추가 준비 (Task 6 컴포넌트 테스트용). 지금은 순수 테스트가 node로 돌면 유지.

**Interfaces:**
- Consumes: Task 1의 디렉터리 관례.
- Produces: 순수 모듈 import 경로 확정 (컴포넌트가 `../card`, `../app` 등에서 타입 import).

- [ ] **Step 1: 경로 정합** — 순수 모듈·테스트가 새 구조에서 import 가능하도록 경로만 맞춘다
  (내용 수정 금지). `app.ts`가 `data.ts`의 `snapshotAgeDays`를 쓰므로 `data.ts`의 순수
  부분(`snapshotAgeDays`)은 유지, fetch 부분은 Task 4에서 로더로 대체 예정임을 주석으로 표시.

- [ ] **Step 2: 전체 순수 테스트**

Run: `npm test`
Expected: 순수 로직 테스트 전부 PASS (render.test는 아직 옛 형태 — Task 3에서 대체하므로
이 시점 실패 시 Task 3까지 보류 처리하되, card/picks/app/season/produce/data/parse/fetch는 PASS여야 함).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: 순수 모듈·테스트 새 구조에 정합"
```

---

### Task 3: 표시 컴포넌트 (PriceBlock·Sparkline·PeakDot 정적·Note)

**Files:**
- Create: `src/components/PriceBlock.tsx`, `src/components/Sparkline.tsx`, `src/components/Note.tsx`, `src/components/PeakDot.tsx`
- Test: `src/components/*.test.tsx` (Task 6에서 RTL 설정 후 채우거나, 여기서 최소 추가)

**Interfaces:**
- Consumes: `PriceCardView`·`SparkView`·`NoteView` (from `../card`)
- Produces: `<PriceBlock price>`, `<Sparkline spark>`, `<Note note>`, `<PeakDot>` (정적 마크업; 탭 토글은 Task 5에서 client화)

- [ ] **Step 1: PriceBlock** — `src/components/PriceBlock.tsx`. `render.ts`의 HTML을 JSX로 직역
  (클래스명 동일, `escapeHtml` 불필요):

```tsx
import type { PriceCardView } from '../card'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

const ArrowDown = () => (
  <svg className="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 1 V10 M2 6.5 L5.5 10 L9 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ArrowUp = () => (
  <svg className="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 11 V2 M2 5.5 L5.5 2 L9 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function PriceBlock({ price: p }: { price: PriceCardView }) {
  const dir = p.change?.kind === 'rise' ? 'rise' : 'fall'
  const showChip = p.change?.kind === 'fall' || p.change?.kind === 'rise'
  return (
    <div className={`price ${dir}`}>
      {p.wasMonthAgo !== null && <span className="was num">{won(p.wasMonthAgo)}</span>}
      <span className="nowline">
        {showChip && (
          <span className="chip">
            {p.change!.kind === 'fall' ? <ArrowDown /> : <ArrowUp />}
            {(p.change as { pct: number }).pct}%
          </span>
        )}
        <span className="big num">
          {p.now.toLocaleString('ko-KR')}
          <span className="wonu">원</span>
        </span>
      </span>
      {p.perUnit !== null && <span className="per num">개당 {won(p.perUnit)}</span>}
      {p.change?.kind === 'similar' && <span className="near">한 달 전과 비슷해요</span>}
    </div>
  )
}
```

- [ ] **Step 2: Sparkline** — `src/components/Sparkline.tsx`:

```tsx
import type { SparkView } from '../card'

const n = (x: number) => x.toLocaleString('ko-KR')

export function Sparkline({ spark: s }: { spark: SparkView }) {
  const [yr, mo, now] = s.points
  const label = `가격 추이: 작년 이맘때 ${n(s.yearAgo)} · 한 달 전 ${n(s.monthAgo)} · 지금 ${n(s.now)}`
  return (
    <div className="spark num">
      <svg viewBox="0 0 300 72" role="img" aria-label={label}>
        <polyline className="trend" points={`${yr.x},${yr.y.toFixed(1)} ${mo.x},${mo.y.toFixed(1)} ${now.x},${now.y.toFixed(1)}`} />
        <text className="val" x={yr.x} y={(yr.y - 8).toFixed(1)} textAnchor="middle">{n(s.yearAgo)}</text>
        <text className="val" x={mo.x} y={(mo.y - 8).toFixed(1)} textAnchor="middle">{n(s.monthAgo)}</text>
        <text className="val now" x={now.x} y={(now.y - 8).toFixed(1)} textAnchor="middle">{n(s.now)}</text>
        <circle className="pt" cx={yr.x} cy={yr.y.toFixed(1)} r="1.9" />
        <circle className="pt" cx={mo.x} cy={mo.y.toFixed(1)} r="1.9" />
        <circle className="pt now" cx={now.x} cy={now.y.toFixed(1)} r="2.3" />
        <line className="axis" x1="8" y1="54" x2="292" y2="54" />
        <text className="lab" x="45" y="69" textAnchor="middle">작년 이맘때</text>
        <text className="lab" x="150" y="69" textAnchor="middle">한 달 전</text>
        <text className="lab now" x="255" y="69" textAnchor="middle">지금</text>
      </svg>
    </div>
  )
}
```

- [ ] **Step 3: Note** — `src/components/Note.tsx`:

```tsx
import type { NoteView } from '../card'

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div className="nrow"><span className="lbl">{label}</span><span>{text}</span></div>
  )
}

export function Note({ note }: { note: NoteView }) {
  return (
    <div className="note">
      <Row label="고르는 법" text={note.pick} />
      <Row label="보관" text={note.store} />
      <Row label="쓰임" text={note.use} />
    </div>
  )
}
```

- [ ] **Step 4: PeakDot (정적 버전)** — `src/components/PeakDot.tsx` (Task 5에서 탭 토글 추가):

```tsx
export function PeakDot() {
  return (
    <button className="peak-dot" type="button" aria-label="지금이 제철 절정">
      <b></b>
      <span className="peak-tip">지금이 맛의 절정이에요</span>
    </button>
  )
}
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 이 컴포넌트들에 타입 에러 없음 (기존 @types/node 노이즈는 무시).

- [ ] **Step 6: Commit**

```bash
git add src/components
git commit -m "feat: 표시 컴포넌트 (PriceBlock·Sparkline·Note·PeakDot)"
```

---

### Task 4: ProduceCard + App 컴포넌트 + 라우트 로더

**Files:**
- Create: `src/components/ProduceCard.tsx`, `src/components/App.tsx`
- Create/Modify: 공개 라우트 파일 (Task 1에서 확정한 경로), 로더에서 JSON 로드 + `buildAppView`
- Test: `src/components/App.test.tsx` (Task 6에서 RTL)

**Interfaces:**
- Consumes: `CardView`·`AppView`·`Chip` (from `../card`·`../render`... → 주: `AppView`는 현재
  `render.ts`에 정의. 이식 시 **`AppView`/`Chip` 타입을 `src/view-types.ts`로 이동**해
  컴포넌트·`app.ts`·로더가 공유하게 한다. `render.ts`는 삭제되므로 그 타입을 옮긴다.)
  하위 컴포넌트 `<PriceBlock>`·`<Sparkline>`·`<Note>`·`<PeakDot>`.
- Produces: `<App view={AppView}>`, 프리렌더되는 `/` 라우트.

- [ ] **Step 1: AppView/Chip 타입 이동** — `src/view-types.ts` 생성, `render.ts`의 `AppView`·`Chip`
  인터페이스를 그대로 옮긴다. `app.ts`의 `import type { AppView } from './render'`를
  `'./view-types'`로 바꾼다. (`card.ts` 타입은 그대로.)

```ts
// src/view-types.ts
import type { CardView } from './card'
export interface Chip { emoji: string; name: string }
export interface AppView {
  cards: CardView[]
  noDrop: boolean
  seasonal: Chip[]
  coming: Chip[]
  date: Date
  staleDays: number
  term?: string
}
```

- [ ] **Step 2: ProduceCard** — `src/components/ProduceCard.tsx`:

```tsx
import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { Note } from './Note'
import { PeakDot } from './PeakDot'

export function ProduceCard({ card }: { card: CardView }) {
  return (
    <details className="card" data-cat={card.category}>
      <summary>
        <span className="id">
          <span className="emoji">{card.emoji}</span>
          <span>
            <span className="card-title">{card.name}{card.inPeak && <PeakDot />}</span>
            <span className="kind">{card.kind}</span>
          </span>
        </span>
        {card.price && <PriceBlock price={card.price} />}
      </summary>
      <div className="open">
        <p className="why">{card.whyNow}</p>
        {card.price?.spark && <Sparkline spark={card.price.spark} />}
        <Note note={card.note} />
      </div>
    </details>
  )
}
```

- [ ] **Step 3: App** — `src/components/App.tsx`. `render.ts`의 `renderApp` 구조를 JSX로
  (스케치 SVG·주간 라벨·필터·리스트·제철·곧 제철·푸터). 주간 라벨은 `weekLabel`을
  `src/week.ts`로 옮겨 재사용(순수):

```tsx
import type { AppView } from '../view-types'
import { weekLabel } from '../week'
import { ProduceCard } from './ProduceCard'

const Sprig = () => (
  <svg className="sprig" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <path d="M20 110 C 45 85, 70 55, 98 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M46 82 C 38 68, 40 58, 52 50 C 56 62, 54 72, 46 82 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M64 60 C 74 46, 86 42, 98 46 C 92 58, 80 64, 64 60 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M34 96 C 26 88, 24 78, 30 70 C 38 76, 40 88, 34 96 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="98" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export function App({ view }: { view: AppView }) {
  const { cards, noDrop, seasonal, coming, date, staleDays, term } = view
  const month = date.getMonth() + 1
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return (
    <>
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>지금 장바구니에 담기 좋은 것들</h1>
        {staleDays >= 3 && <p className="stale">가격은 {staleDays}일 전 기준이에요</p>}
      </header>
      <main>
        <section className="picks">
          {cards.length > 0 ? (
            <>
              <input type="radio" name="cat-filter" id="f-all" defaultChecked />
              <input type="radio" name="cat-filter" id="f-fruit" />
              <input type="radio" name="cat-filter" id="f-veg" />
              <div className="filter">
                <label htmlFor="f-all">전체</label>
                <label htmlFor="f-fruit">과일</label>
                <label htmlFor="f-veg">채소</label>
              </div>
              {noDrop && <p className="nodrop">이번 주는 크게 내려온 게 없어요. 제철은 그대로 곁에 있어요.</p>}
              <div className="list">
                {cards.map((c, i) => <ProduceCard key={i} card={c} />)}
              </div>
            </>
          ) : (
            <p className="empty">이번 달 제철 정보가 아직 없어요</p>
          )}
        </section>
        <section className="seasonal">
          <h2>{month}월의 제철</h2>
          <ul>{seasonal.map((c, i) => <li key={i}>{c.emoji} {c.name}</li>)}</ul>
        </section>
        {coming.length > 0 && (
          <p className="coming"><span>곧 제철</span> · {coming.map((c) => `${c.emoji} ${c.name}`).join(' · ')}</p>
        )}
      </main>
      <footer>
        <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
      </footer>
    </>
  )
}
```

  그리고 `src/week.ts` 생성 — `render.ts`의 `weekLabel`을 그대로 이동:

```ts
// src/week.ts
export function weekLabel(date: Date): string {
  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const idx = Math.min(Math.ceil(date.getDate() / 7), ordinals.length) - 1
  return `${date.getMonth() + 1}월 ${ordinals[idx]} 주`
}
```

- [ ] **Step 4: 라우트 로더 배선** — Task 1에서 확정한 라우트 파일에서, 로더가
  `produce.json`·`prices.json`을 읽어 `buildAppView(profiles, snapshot, new Date())`를
  호출하고, 컴포넌트에서 `<App view={loaderData} />`를 렌더. **로더에서 로컬 JSON을 읽는
  정확한 방법(import vs public fetch vs server read)은 Task 1 노트/현재 문서 기준.**
  기존 `src/data.ts`의 파싱 계약(`PriceSnapshot`/`ProduceProfile` 형태)은 유지.

- [ ] **Step 5: 빌드·프리렌더 확인**

Run: (Task 1 확정 빌드 명령)
Expected: `/` 정적 산출물에 카드·가격·절정·제철 리스트·곧 제철이 프리렌더됨.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ProduceCard·App 컴포넌트 + 라우트 로더(buildAppView) 배선"
```

---

### Task 5: 절정 dot 탭 토글 (client)

**Files:**
- Modify: `src/components/PeakDot.tsx` (client 동작 추가) 또는 상위에서 위임 핸들러
- Test: `src/components/PeakDot.test.tsx` (Task 6)

**Interfaces:**
- Produces: 터치 탭 시 카드 펼침을 막고 툴팁만 여닫는 `<PeakDot>`.

- [ ] **Step 1: 탭 토글 구현** — 현행 `main.ts` 위임 핸들러의 React 판. 옵션 A(권장): App
  루트에서 위임(현행과 동일 로직) — client 컴포넌트로 `useEffect`에서 문서 위임 리스너를
  달아 `.peak-dot` 탭 시 `preventDefault()` + `.show` 토글, 그 외 탭이면 열린 툴팁 닫기.
  **TanStack Start의 client-only 컴포넌트/`useEffect` SSR 안전 처리 방식은 현재 문서로 확인.**

```tsx
// 위임 로직 (현행 main.ts와 동일 규칙) — client 경계에서 실행
// e.target.closest('.peak-dot') 없으면 열린 .show 모두 닫고 return
// 있으면 e.preventDefault(); dot.classList.toggle('show')
```

- [ ] **Step 2: 빌드·브라우저 실측** — 프리렌더 후 dev/preview에서 dot 탭 → 툴팁 뜨고
  카드 안 열림, 다른 곳 탭 → 툴팁 닫힘. (자동 테스트는 Task 6.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: 절정 dot 터치 탭 토글 (client)"
```

---

### Task 6: 스타일 + 컴포넌트 테스트(RTL)

**Files:**
- Modify: 루트 진입/라우트에서 `import '../style.css'` (또는 프레임워크 관례 위치)
- Modify: `package.json`(devDep `@testing-library/react`·jsdom), vitest 설정(`environment: 'jsdom'`)
- Create: `src/components/PriceBlock.test.tsx`, `App.test.tsx`, `PeakDot.test.tsx`

**Interfaces:**
- Consumes: 모든 컴포넌트.

- [ ] **Step 1: 스타일 연결** — `src/style.css`를 루트에서 import. 빌드 산출물 CSS에
  가격·스파크·노트·필터·절정 클래스가 포함되는지 확인.

- [ ] **Step 2: RTL 환경** — `@testing-library/react`·jsdom devDep 추가, vitest `environment: 'jsdom'`
  (파일별 `// @vitest-environment jsdom` 또는 config). **정확한 vitest 설정은 현재 문서 확인.**

- [ ] **Step 3: PriceBlock 테스트** — `src/components/PriceBlock.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PriceBlock } from './PriceBlock'

describe('PriceBlock', () => {
  test('하락: 취소선·칩·큰가격·개당값, fall 클래스', () => {
    const { container } = render(<PriceBlock price={{ now: 12600, wasMonthAgo: 16900, perUnit: 1260, change: { kind: 'fall', pct: 25 }, spark: null }} />)
    const html = container.innerHTML
    expect(container.querySelector('.price.fall')).not.toBeNull()
    expect(html).toContain('16,900원')
    expect(html).toContain('12,600')
    expect(html).toContain('25%')
    expect(html).toContain('개당 1,260원')
  })
  test('similar은 칩 없이 비슷 문구·쪽빛', () => {
    const { container } = render(<PriceBlock price={{ now: 5000, wasMonthAgo: 5010, perUnit: null, change: { kind: 'similar' }, spark: null }} />)
    expect(container.querySelector('.price.fall')).not.toBeNull()
    expect(container.querySelector('.chip')).toBeNull()
    expect(container.textContent).toContain('비슷')
  })
  test('rise 클래스', () => {
    const { container } = render(<PriceBlock price={{ now: 5000, wasMonthAgo: 4400, perUnit: null, change: { kind: 'rise', pct: 14 }, spark: null }} />)
    expect(container.querySelector('.price.rise')).not.toBeNull()
  })
})
```

- [ ] **Step 4: App 테스트** — `src/components/App.test.tsx`. `toCardView`로 카드 구성 후
  `<App view>` 렌더 → data-cat·필터·whyNow·곧 제철·빈 상태 검증:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { App } from './App'
import { toCardView } from '../card'
import type { PickResult } from '../picks'
import type { ProduceProfile } from '../types'

const profile: ProduceProfile = {
  id: 'peach', name: '복숭아', emoji: '🍑', category: 'fruit',
  kamis: { categoryCode: '400', itemName: '복숭아' },
  seasonMonths: [7, 8], peakMonths: [7], whyNow: { default: '여름이 절정이에요' },
  howToPick: 'p', howToStore: 's', howToUse: 'u',
}
const pick: PickResult = { profile, inPeak: true, price: { price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7, priceMonthAgo: 24500, priceYearAgo: 19800 } }
const base = { cards: [toCardView(pick, 7)], noDrop: false, seasonal: [{ emoji: '🍑', name: '복숭아' }], coming: [], date: new Date('2026-07-10'), staleDays: 0 }

describe('App', () => {
  test('카드·필터·whyNow 렌더', () => {
    const { container } = render(<App view={base} />)
    const html = container.innerHTML
    expect(html).toContain('data-cat="fruit"')
    expect(container.querySelector('#f-fruit')).not.toBeNull()
    expect(html).toContain('여름이 절정이에요')
    expect(html).toContain('18,200')
    expect(container.querySelector('.peak-dot')).not.toBeNull()
  })
  test('카드 없으면 안내·필터 없음', () => {
    const { container } = render(<App view={{ ...base, cards: [] }} />)
    expect(container.textContent).toContain('이번 달 제철 정보가 아직 없어요')
    expect(container.querySelector('#f-fruit')).toBeNull()
  })
  test('noDrop·곧 제철', () => {
    const { container } = render(<App view={{ ...base, noDrop: true, coming: [{ emoji: '🍇', name: '포도' }] }} />)
    expect(container.textContent).toContain('크게 내려온 게 없어요')
    expect(container.textContent).toContain('포도')
  })
})
```

- [ ] **Step 5: 절정 dot 탭 테스트** — `src/components/PeakDot.test.tsx`: jsdom에서 dot 클릭 →
  `.show` 토글 및 부모 `<details>` 미토글(`preventDefault`) 확인. (Task 5 배선 방식에 맞춰
  렌더 트리 구성.)

- [ ] **Step 6: 전체 테스트**

Run: `npm test`
Expected: 순수 로직 + 컴포넌트 테스트 전부 PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: 스타일 연결 + 컴포넌트 테스트(RTL)"
```

---

### Task 7: 옛 뷰 제거 + 배포·문서 개정

**Files:**
- Delete: `src/render.ts`, `src/main.ts`, `tests/render.test.ts`, 옛 `index.html`(프레임워크가 대체)
- Modify: `.github/workflows/deploy.yml` (프리렌더 산출물 배포), `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: Task 1~6 완료물.

- [ ] **Step 1: 옛 뷰 제거** — `render.ts`·`main.ts`·`render.test.ts` 삭제(기능은 컴포넌트+라우트가
  대체). 삭제 후 참조 잔존 없는지 grep: `grep -rn "from './render'\|from './main'" src tests` → 빈 결과.

- [ ] **Step 2: 배포 워크플로 개정** — `deploy.yml`을 TanStack Start 프리렌더 빌드→정적 산출물
  배포로 고친다(Task 1 확정 명령·산출물 경로). `base` 경로 환경변수 관례(루트/하위경로) 유지 검토.
  **배포 타겟 세부는 현재 문서 + 사용자 호스트(Cloudflare Pages/GitHub Pages) 기준.**

- [ ] **Step 3: 문서 개정** — `CLAUDE.md`:
  - "런타임 의존성 0"·"devDependencies는 vite/vitest/typescript만" 삭제/개정 (React·TanStack
    Start·RTL이 의존성). 
  - 이번 사이클 유지 원칙 명시: 런타임 외부요청 없음, 공개 페이지 경량·무추적, 담백한 한국어,
    순수 로직은 `picks/card/app`·데이터 접근 경계.
  - 명령어 절 갱신(dev/build/test가 TanStack Start 기준으로 바뀌면).
  `README.md`도 스택 변경 반영.

- [ ] **Step 4: 전체 테스트·빌드**

Run: `npm test && (프리렌더 빌드 명령)`
Expected: 테스트 PASS, 정적 산출물 생성.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: 옛 뷰 제거 + 배포·CLAUDE 개정 (TanStack Start)"
```

---

### Task 8: 파리티 검증 (실측)

**Files:** 검증 전용.

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS.

- [ ] **Step 2: 프리렌더 산출물 정적성 확인** — 빌드 산출물 HTML에 카드·가격·제철이
  **JS 없이** 들어있는지(프리렌더). 산출물을 정적 서빙(preview)해 열어본다.

- [ ] **Step 3: 브라우저 실측(390px)** — 파리티 체크리스트(리팩토링 전과 동일해야):
  - 접힘 카드: 이모지·이름·절정 dot·품종 / 취소선·칩·큰가격·개당값
  - 펼침: whyNow → 스파크라인(값 위·가는 x축) → 먹지 노트(키 정렬)
  - 필터 전체/과일/채소 토글 (CSS만)
  - 절정 dot 탭 → 툴팁 뜨고 카드 안 열림; 다른 곳 탭 → 닫힘
  - 하락 없을 때 안내, 하단 곧 제철, 헤더 절기·스케치·블롭

- [ ] **Step 4: Commit (필요 시)**

```bash
git add -A
git commit -m "chore: TanStack Start 이식 파리티 검증"
```

---

## Self-Review

**1. Spec coverage:**
- 스택 TanStack Start → Task 1 ✓ · 순수 모듈 이식 → Task 2 ✓ · render→컴포넌트 → Task 3·4 ✓ ·
  로더+buildAppView 프리렌더 → Task 1(스파이크)·4 ✓ · CSS 우선 인터랙션 → Task 4(필터/details)·5(dot) ✓ ·
  스타일 보존 → Task 6 ✓ · 테스트(순수 유지 + RTL) → Task 2·6 ✓ · 정적 배포 → Task 1·7 ✓ ·
  문서 개정 → Task 7 ✓ · alpha 프리렌더 게이트 → Task 1 ✓ · 비범위(계정/서버) → 전 태스크에서 미포함 ✓

**2. Placeholder scan:** 프레임워크 무관 코드(컴포넌트·타입·이동)는 완전한 코드 포함. 프레임워크
글루(스캐폴드·라우트·로더·프리렌더·배포·client 처리·vitest jsdom)는 **"현재 문서(context7)로 검증"**을
명시 — alpha 도구에 대한 올바른 방법이며 모호한 "TODO"가 아니다. Task 1이 이 관례들을 확정해
후속 태스크가 참조하도록 게이트로 배치.

**3. Type consistency:** `CardView`/`PriceCardView`/`SparkView`/`NoteView`(card.ts, 불변) → 컴포넌트
props 일치. `AppView`/`Chip`는 Task 4에서 `view-types.ts`로 이동하고 `app.ts` import를 갱신 —
후속 참조 일관. `weekLabel`은 Task 4에서 `week.ts`로 이동. `toCardView`(card.ts)로 App 테스트 구성.

## Execution Handoff

(아래 실행 방식은 대화에서 선택)
