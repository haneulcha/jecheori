# 본문 폰트 Wanted Sans 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 전반의 타이포를 self-host Wanted Sans(콘텐츠 서브셋) 하나로 통일하고, 마루부리(세리프)를 완전히 제거한다. 손글씨는 유일한 캐릭터 폰트로 남기며 드리프트를 수정하고, 두 폰트 모두 "빠진 글자 = 빌드 실패" 가드를 건다.

**Architecture:** 서브셋 생성(`scripts/subset-fonts.mjs`, `pyftsubset` 호출)과 커버리지 가드(vitest)가 **같은 글리프 도출 로직**(`scripts/lib/font-glyphs.mjs`)을 공유한다. 스크립트가 실제 서브셋한 글자를 `src/fonts/coverage.json`에 기록하고, 테스트는 콘텐츠에서 필요한 글자를 다시 계산해 그 커버리지에 포함되는지 검사한다 — 콘텐츠를 바꾸고 스크립트를 안 돌리면 테스트가 깨진다.

**Tech Stack:** TanStack Start(React 19) + Vite + Vitest. 폰트 서브셋은 Python `fonttools`(`pyftsubset`) + `brotli`(로컬 사전 설치, 이미 확인됨). Node ESM 스크립트가 오케스트레이션.

## Global Constraints

- node ≥ 22.
- 공개 페이지는 경량·무추적·런타임 외부요청 없음. 폰트는 self-host woff2, CDN 금지.
- 폰트 파일은 `src/fonts/`, `global.css`에서 `./fonts/...` 상대경로 참조(Vite가 base·해시 처리).
- 완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과.
- UI·CSS 변경은 `npm run dev` 브라우저 **모바일 28rem 폭** 실측 + 스크린샷 사인오프.
- 사용자 문구 한국어·담백, 이커머스 화법 금지.
- 순수 로직 테스트는 `tests/`에 `'../src/…'` 임포트. 컴포넌트 테스트는 `src/components/*.test.tsx` + `// @vitest-environment jsdom`.
- 앱이 실제 쓰는 font-weight = **400 / 600 / 700 / 800**. 이 넷을 모두 서브셋한다(어떤 슬롯도 조용히 가벼워지지 않게).

---

### Task 1: 공유 글리프 헬퍼 + 정적 글자 파일 + 커버리지 가드 테스트

폰트 생성과 가드가 공유할 "필요 글자" 계산을 먼저 만들고, 그것을 검사하는 테스트를 건다(폰트·coverage.json이 아직 없어 실패한다 — Task 2에서 통과).

**Files:**
- Create: `scripts/lib/font-glyphs.mjs`
- Create: `scripts/lib/font-extra-glyphs.txt`
- Create: `tests/font-coverage.test.ts`

**Interfaces:**
- Produces: `font-glyphs.mjs` exports
  - `bodyGlyphs(): Set<string>` — 본문 폰트가 덮어야 할 모든 글자(produce.json 텍스트 전 필드 + season 절기명 + `font-extra-glyphs.txt`).
  - `handGlyphs(): Set<string>` — 손글씨가 덮어야 할 글자(produce.json `name`+`kind`+`whyNow` + 손글씨 문장부호).
  - `HAND_PUNCT: string` 상수.
  - 각 함수는 공백(`\s`)을 제외한 글자만 반환.

- [ ] **Step 1: 공유 헬퍼 작성**

`scripts/lib/font-glyphs.mjs`:

```js
// 폰트 서브셋 생성(scripts/subset-fonts.mjs)과 커버리지 가드(tests/font-coverage.test.ts)가
// 공유하는 "필요 글자" 계산. 둘이 같은 로직을 쓰므로, 콘텐츠를 바꾸고 서브셋을 다시 안
// 돌리면 coverage.json이 낡아 가드가 깨진다.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const readText = (p) => readFileSync(join(ROOT, p), 'utf8')
const loadProduce = () => JSON.parse(readText('public/data/produce.json'))

// 손글씨(.why=whyNow)에 흔히 섞이는 문장부호·숫자. 손글씨 폰트만 이 세트를 여백으로 받는다.
export const HAND_PUNCT = "0123456789 .,·–—…“”‘’()~%/"

const stripSpace = (set) => {
  for (const c of [...set]) if (/\s/.test(c)) set.delete(c)
  return set
}

/** 절기명(‘소서’ 등) — season.ts 를 원문으로 읽어 name 리터럴만 뽑는다. */
function seasonTermChars() {
  const src = readText('src/season.ts')
  const chars = new Set()
  for (const m of src.matchAll(/name:\s*'([^']+)'/g)) for (const c of m[1]) chars.add(c)
  return chars
}

export function bodyGlyphs() {
  const chars = new Set()
  for (const p of loadProduce()) {
    for (const c of p.name ?? '') chars.add(c)
    for (const c of p.kind ?? '') chars.add(c)
    for (const k of ['howToPick', 'howToStore', 'howToUse']) for (const c of p[k] ?? '') chars.add(c)
    for (const line of Object.values(p.whyNow ?? {})) for (const c of line) chars.add(c)
  }
  for (const c of seasonTermChars()) chars.add(c)
  for (const c of readText('scripts/lib/font-extra-glyphs.txt')) chars.add(c)
  return stripSpace(chars)
}

export function handGlyphs() {
  const chars = new Set()
  for (const p of loadProduce()) {
    for (const c of p.name ?? '') chars.add(c)
    for (const c of p.kind ?? '') chars.add(c)
    for (const line of Object.values(p.whyNow ?? {})) for (const c of line) chars.add(c)
  }
  for (const c of HAND_PUNCT) chars.add(c)
  return stripSpace(chars)
}
```

- [ ] **Step 2: 정적 UI 글자 파일 작성**

`scripts/lib/font-extra-glyphs.txt` — produce.json·season 밖에서 화면에 나오는 정적 문구·숫자·기호. (누락돼도 Task 6 브라우저 실측 + 가드가 잡아 확장하면 된다.)

```
이번 달 값이 내려온 제철 다가오는 오는 고르는 법 보관 쓰임 레시피 영양 성분
기준 개당 지난주 지난달 작년 대비 원 없어요 아직 정보가 제철이 한마디 목차
주 월 일 첫째 둘째 셋째 넷째 이번 절정 제철 아님 곧
0123456789.,%~·−-+()[]/'"“”‘’…℃₩
kcal g kg mg ml L
```

- [ ] **Step 3: 커버리지 가드 테스트 작성**

`tests/font-coverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { bodyGlyphs, handGlyphs } from '../scripts/lib/font-glyphs.mjs'

// coverage.json = scripts/subset-fonts.mjs 가 마지막으로 서브셋한 글자(본문/손글씨).
// 콘텐츠가 바뀌었는데 서브셋을 다시 안 돌리면 이 검사가 깨진다.
const coverage = JSON.parse(readFileSync(new URL('../src/fonts/coverage.json', import.meta.url), 'utf8')) as {
  body: string
  hand: string
}

const missing = (need: Set<string>, have: string) => {
  const has = new Set(have)
  return [...need].filter((c) => !has.has(c)).sort()
}

describe('폰트 서브셋 커버리지', () => {
  it('본문(Wanted Sans)이 앱의 모든 글자를 덮는다', () => {
    expect(missing(bodyGlyphs(), coverage.body)).toEqual([])
  })
  it('손글씨(받아쓰기)가 whyNow의 모든 글자를 덮는다', () => {
    expect(missing(handGlyphs(), coverage.hand)).toEqual([])
  })
})
```

- [ ] **Step 4: 실패 확인**

Run: `npx vitest run tests/font-coverage.test.ts`
Expected: FAIL — `src/fonts/coverage.json` 없음(ENOENT). (Task 2에서 생성 후 통과.)

- [ ] **Step 5: 커밋**

```bash
git add scripts/lib/font-glyphs.mjs scripts/lib/font-extra-glyphs.txt tests/font-coverage.test.ts
git commit -m "test(fonts): 폰트 서브셋 커버리지 가드 + 공유 글리프 헬퍼

본문(Wanted)·손글씨(받아쓰기) 서브셋에 콘텐츠 글자가 빠지면 실패.
scripts/subset-fonts.mjs 와 로직 공유(coverage.json 낡으면 깨짐).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 서브셋 생성 스크립트 + 폰트 파일 + coverage.json (마루부리 제거)

Wanted Sans 4벌을 콘텐츠 서브셋으로 생성하고, 손글씨를 재생성(드리프트 수정)하며, `coverage.json`을 기록한다. 마루부리·구 bash 스크립트를 제거한다.

**Files:**
- Create: `scripts/subset-fonts.mjs`
- Create: `src/fonts/WantedSans-400.woff2`, `-600.woff2`, `-700.woff2`, `-800.woff2` (스크립트 산출)
- Modify (overwrite): `src/fonts/HakgyoansimBadasseugi-L.woff2` (재생성)
- Create: `src/fonts/coverage.json` (스크립트 산출)
- Delete: `src/fonts/MaruBuri-Regular.woff2`, `src/fonts/MaruBuri-Bold.woff2`
- Delete: `scripts/subset-handwriting-font.sh` (mjs가 대체)
- Test: `tests/font-coverage.test.ts` (Task 1) 통과로 검증

**Interfaces:**
- Consumes: `scripts/lib/font-glyphs.mjs`의 `bodyGlyphs()`, `handGlyphs()`.
- Produces: `src/fonts/WantedSans-<400|600|700|800>.woff2`, 재생성된 `HakgyoansimBadasseugi-L.woff2`, `src/fonts/coverage.json` (`{ body: string, hand: string }`).

- [ ] **Step 1: 생성 스크립트 작성**

`scripts/subset-fonts.mjs`:

```js
#!/usr/bin/env node
// 앱 폰트 서브셋 재생성 — 본문(Wanted Sans, OFL) 4벌 + 손글씨(받아쓰기 L, OFL).
// 전체 한글(수백 KB/벌) 대신 콘텐츠(produce.json+season+정적문구)에 쓰인 글자만 서브셋한다.
// produce.json·whyNow·정적 UI 문구를 고쳐 새 음절이 들어오면 이 스크립트를 다시 돌린다.
//   npm run subset:fonts   (사전요구: python3 + fonttools + brotli, curl)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bodyGlyphs, handGlyphs } from './lib/font-glyphs.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/fonts')
const tmp = mkdtempSync(join(tmpdir(), 'subset-'))

const WANTED = 'https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/otf'
const HAND_TTF = 'https://github.com/fonts-archive/HakgyoansimBadasseugi/raw/main/HakgyoansimBadasseugi-L.ttf'
const WEIGHTS = [ ['400', 'Regular'], ['600', 'SemiBold'], ['700', 'Bold'], ['800', 'ExtraBold'] ]

const dl = (url, path) => execFileSync('curl', ['-sL', url, '-o', path])
const subset = (src, chars, out) => {
  const cf = join(tmp, 'chars.txt'); writeFileSync(cf, chars)
  execFileSync('pyftsubset', [src, `--text-file=${cf}`, '--flavor=woff2',
    '--layout-features=*', '--desubroutinize', '--no-hinting', `--output-file=${out}`])
  return Math.round(statSync(out).size / 1024)
}

const bodyChars = [...bodyGlyphs()].sort().join('')
const handChars = [...handGlyphs()].sort().join('')

console.log('· 본문 Wanted Sans 4벌 서브셋…')
for (const [w, name] of WEIGHTS) {
  const src = join(tmp, `w-${w}.otf`); dl(`${WANTED}/WantedSans-${name}.otf`, src)
  const kb = subset(src, bodyChars, join(OUT, `WantedSans-${w}.woff2`))
  console.log(`  ${w}: ${kb}KB`)
}

console.log('· 손글씨 받아쓰기 L 재생성…')
const handSrc = join(tmp, 'hand.ttf'); dl(HAND_TTF, handSrc)
const handKb = subset(handSrc, handChars, join(OUT, 'HakgyoansimBadasseugi-L.woff2'))
console.log(`  ${handKb}KB`)

writeFileSync(join(OUT, 'coverage.json'), JSON.stringify({ body: bodyChars, hand: handChars }) + '\n')
rmSync(tmp, { recursive: true, force: true })
console.log('· 완료: src/fonts/ (WantedSans-*.woff2, HakgyoansimBadasseugi-L.woff2, coverage.json)')
```

- [ ] **Step 2: `npm run subset:fonts` 스크립트 등록**

`package.json`의 `scripts`에 추가(위치: `report:coverage` 근처):

```json
"subset:fonts": "node scripts/subset-fonts.mjs",
```

- [ ] **Step 3: 생성 실행**

Run: `npm run subset:fonts`
Expected: 본문 400/600/700/800 각 ~52–55KB, 손글씨 ~30KB 내외 출력. `src/fonts/`에 5개 woff2 + `coverage.json` 생성.

- [ ] **Step 4: 마루부리·구 스크립트 제거**

```bash
git rm src/fonts/MaruBuri-Regular.woff2 src/fonts/MaruBuri-Bold.woff2 scripts/subset-handwriting-font.sh
```

- [ ] **Step 5: 가드 테스트 통과 확인**

Run: `npx vitest run tests/font-coverage.test.ts`
Expected: PASS (본문·손글씨 둘 다 0 누락).

- [ ] **Step 6: 커밋**

```bash
git add scripts/subset-fonts.mjs package.json src/fonts/WantedSans-400.woff2 src/fonts/WantedSans-600.woff2 src/fonts/WantedSans-700.woff2 src/fonts/WantedSans-800.woff2 src/fonts/HakgyoansimBadasseugi-L.woff2 src/fonts/coverage.json
git commit -m "feat(fonts): Wanted Sans 4벌 콘텐츠 서브셋 + 손글씨 재생성, 마루부리 제거

앱 전체 캐릭터 폰트 Wanted Sans(400/600/700/800, ~216KB) self-host.
손글씨 121자 드리프트 수정. 마루부리(865KB)·구 bash 스크립트 제거.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: global.css — @font-face·토큰 교체, 마루부리 참조 제거

**Files:**
- Modify: `src/global.css:1-20` (@font-face), `:50-54` (토큰), `:102-117` (`.week`/`h1`)

**Interfaces:**
- Consumes: Task 2의 `src/fonts/WantedSans-<w>.woff2`.

- [ ] **Step 1: @font-face 블록 교체**

`src/global.css` 상단 마루부리 2블록(줄 1–12)을 Wanted Sans 4블록으로 교체:

```css
@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-600.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-800.woff2') format('woff2');
  font-weight: 800;
  font-display: swap;
}
```

손글씨 `@font-face` 블록(줄 13–20)은 두되, 그 위 주석의 옛 스크립트 경로만 갱신:
`(scripts/subset-handwriting-font.sh)` → `(npm run subset:fonts)`.

- [ ] **Step 2: 폰트 토큰 교체**

`src/global.css`의 폰트 변수(줄 50–54)를 교체:

```css
  /* 폰트 패밀리 — @font-face 별칭 그대로. 못 구하면 시스템 고딕 폴백. */
  --font-body: 'Wanted Sans', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
  --font-hand: 'Hakgyoansim', 'Wanted Sans', 'Apple SD Gothic Neo', sans-serif;
  --font-mono: 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
```

(`--font-display` 줄은 삭제한다.)

- [ ] **Step 3: `.week`·`h1`의 `--font-display` 참조 제거**

`.week`(줄 102–108)에서 `font-family: var(--font-display);` 줄을 **삭제**한다(본문=Wanted 상속, 현행 400 유지).

`header h1`(줄 109–117)에서 `font-family: var(--font-display);` 줄을 **삭제**한다(`font-weight: 700`은 유지 → Wanted 700 상속).

- [ ] **Step 4: 마루부리 잔존 참조 0 확인**

Run: `grep -rniE "MaruBuri|font-display" src`
Expected: 출력 없음(빈 결과).

- [ ] **Step 5: 게이트 통과 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS (전체).

- [ ] **Step 6: 커밋**

```bash
git add src/global.css
git commit -m "feat(fonts): global.css를 Wanted Sans로 전환, 마루부리·--font-display 제거

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 소제목 라벨 역할 통일 (Note 라벨)

"고르는 법/보관/쓰임" 라벨을 카드의 기존 라벨(`recipeLabel`: 넓은 자간)과 같은 결로.

**Files:**
- Modify: `src/components/Note.module.css` (`.nrow .lbl`)

- [ ] **Step 1: `.lbl` 라벨 역할 적용**

`src/components/Note.module.css`의 `.nrow .lbl` 규칙을 교체:

```css
.nrow .lbl { color: var(--ink); font-weight: 600; letter-spacing: 0.08em; }
```

(변경: `font-weight` 700→600, `letter-spacing` 0.02em→0.08em. 색 `--ink`는 유지 — 최종 색은 Task 6 실측에서 확정.)

- [ ] **Step 2: 게이트 통과 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/Note.module.css
git commit -m "style(card): 소제목 라벨을 라벨 역할(넓은 자간·600)로 통일

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 문서 갱신 (DESIGN.md · CLAUDE.md)

**Files:**
- Modify: `DESIGN.md` (타이포그래피 표 + 결정 기록)
- Modify: `CLAUDE.md` (명령어 목록)

- [ ] **Step 1: DESIGN.md 타이포그래피 표 교체**

`DESIGN.md`의 "## 타이포그래피" 표(디스플레이/손글씨/본문/라벨/숫자 행)를 아래로 교체:

```markdown
| 역할 | 폰트 | 사용처 |
|---|---|---|
| 본문·헤딩 | **Wanted Sans** (self-host woff2, 콘텐츠 서브셋, OFL) | 아이브로·h1·품목명·소제목·본문·가격 등 거의 전부. 웨이트 400/600/700/800 |
| 손글씨 | **학교안심 받아쓰기 L** (self-host woff2, 서브셋, OFL) | 카드 표지 하단 "제철이의 한마디"(`.why`) 한 줄만 — 유일한 캐릭터 폰트 |
| 라벨 | 본문 스택 + `letter-spacing: 0.08em` | "고르는 법"·"레시피" 같은 소형 라벨 |
| 숫자 | 본문 스택 + `font-variant-numeric: tabular-nums` | 가격 |
```

이어지는 "폰트 파일은 `src/fonts/`… 마루 부리를 못 구하면…" 문단을 아래로 교체:

```markdown
폰트 파일은 `src/fonts/`, CSS 상대 경로 참조 (Vite가 base 처리). CDN 금지.
못 구하면 시스템 고딕(`Apple SD Gothic Neo` …)으로 폴백.

**콘텐츠 서브셋:** 본문·손글씨 모두 전체 한글이 무거워, 콘텐츠(`produce.json`·`season.ts`·
정적 UI 문구)에 실제 쓰인 글자만 서브셋한다(본문 4벌 ~216KB, 손글씨 ~30KB). 가격이 CI
JSON에서 오듯 폰트도 콘텐츠를 진실의 원천으로 삼는다. 문구를 고쳐 새 음절이 들어오면
`npm run subset:fonts`로 재생성한다 — 안 하면 `tests/font-coverage.test.ts`가 실패한다
(조용한 폴백 대신 시끄러운 실패).
```

- [ ] **Step 2: DESIGN.md 결정 기록 추가**

`DESIGN.md`의 "## 결정 기록" 맨 끝에 항목 추가:

```markdown
- 타이포를 **Wanted Sans 하나로 통일**하고 마루부리(세리프)를 완전히 제거했다 (2026-07-21).
  세리프는 h1·아이브로 헤더에만 갇혀 카드에선 증발했고, 카드 콘텐츠에 얹으면 소제목이 튀었다.
  시안 3라운드(세리프 세 얼굴 → 손글씨만 빼고 고딕 → 캐릭터 고딕 세 후보 앱 전반) 끝에,
  Pretendard급 완성도에 온기를 더한 Wanted Sans로 확정. 손글씨는 유일한 캐릭터 폰트로 승격.
  콘텐츠 서브셋(마루부리 865KB보다 648KB 가벼움) + 커버리지 빌드 가드. 이때 손글씨 서브셋
  121자 드리프트(수산물·축산물 whyNow 미재생성)도 발견·수정. 스펙:
  `docs/superpowers/specs/2026-07-21-body-font-wanted-sans-design.md`
```

- [ ] **Step 3: CLAUDE.md 명령어 교체**

`CLAUDE.md`의 명령어 목록에서 손글씨 서브셋 언급을 대체(없으면 `report:coverage` 아래 추가):

```markdown
- `npm run subset:fonts` — 본문(Wanted Sans)·손글씨 폰트 콘텐츠 서브셋 재생성
  (produce.json·문구 변경 시. 사전요구: python3 + fonttools + brotli)
```

- [ ] **Step 4: 커밋**

```bash
git add DESIGN.md CLAUDE.md
git commit -m "docs: 타이포 Wanted Sans 통합 반영 (DESIGN.md 표·결정기록, CLAUDE.md 명령어)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 검증 — 게이트 + 브라우저 실측 (완료 게이트)

**Files:** 없음(검증만).

- [ ] **Step 1: 전체 게이트**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (커버리지 가드 포함 전체).

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공. `dist/client/assets/`에 `WantedSans-*.woff2` 4개 emit(해시), `MaruBuri` 없음.

- [ ] **Step 3: 개발서버 + 모바일 28rem 실측**

`npm run dev` 후 브라우저를 **폭 448px(28rem)**로 놓고 `/`와 `/coming`을 연다. 확인:
- 아이브로·h1·품목명·소제목·본문·기준선·큰 가격이 **Wanted Sans**로 렌더(시스템 폴백 없음).
- 큰 가격(`.big`)이 800 무게로 이전과 같은 heft.
- 소제목("고르는 법/보관/쓰임")이 넓은 자간 라벨로 앉는지 — 색(ink vs muted) 최종 판단.
- 손글씨 `.why` 한 줄이 받아쓰기체로 렌더.

- [ ] **Step 4: 손글씨 회귀 확인**

`/`(또는 `/coming`)에서 **고등어·갈치·조기·삼치** 카드의 `.why`가 폴백 없이 받아쓰기체로 나오는지 확인(재생성 전 시스템 폰트로 튀던 것).

- [ ] **Step 5: 스크린샷 사인오프**

`/`와 카드 펼침(소제목·손글씨 보이게) 28rem 스크린샷을 사용자에게 제시하고 승인받는다.
색(라벨 ink/muted) 조정 요청이 있으면 Task 4 규칙만 고쳐 재실측.
