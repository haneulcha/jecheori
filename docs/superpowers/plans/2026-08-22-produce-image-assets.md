# 품목 이미지 에셋 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드의 품목 표식을 이모지에서 실사 기반 벡터 도판 70장(288×288 WebP, 투명배경)으로 교체하고, 96px 도판에 맞춰 카드 표지 레이아웃을 개편한다.

**Architecture:** 이미지 생성·검수는 **사람의 로컬 1회성 작업**(씨앗형, CI 없음)이고, 코드는 `image?` 필드를 `produce.json → types → card.ts 두 조립처 → ProduceCard` 파이프라인으로 흘려보내는 것뿐이다. 점유율 80% 정규화만 작은 로컬 헬퍼(`scripts/normalize-produce-images.mjs`)로 코드화한다. 순서는 스펙 §13 그대로 — **코드(Phase C)가 양산(Phase D)보다 앞**이다. 코드가 먼저 서 있어야 66장을 뽑는 족족 실제 화면에 얹어 검수할 수 있고, 다 뽑고 나서 붙이면 잘못 뽑은 걸 66장분 뒤에 발견한다.

**Tech Stack:** TanStack Start (React 19) + Vite + Vitest + Testing Library + Storybook. 이미지 후처리는 `sharp`(devDependency). node ≥ 22.

**참조 스펙:** `docs/superpowers/specs/2026-08-22-produce-image-assets-design.md` (부록 A: 70행 슬롯 사전 · 부록 B: 공유 이미지 매핑)

## Global Constraints

- **완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다** + UI 변경은 브라우저 실측. 실측 경로는 셋 다: `/` · `/coming` · `/livestock` (**축산 14장은 `/livestock`에서만 보인다** — 이 경로를 빼먹으면 축산 도판을 아무도 못 본다).
- **사람 사인오프 게이트가 둘이다** (스펙 §13). ⛔ 게이트 1 = 앵커 4장이 6점 검수를 통과하고 프롬프트가 동결됨. ⛔ 게이트 2 = 실물 앵커를 얹은 표지 레이아웃 시안 사인오프. **에이전트는 이미지를 생성할 수 없고, 시각 방향을 승인할 수 없다** — 각 게이트에서 멈추고 사람에게 넘긴다. 게이트 전 태스크와 후 태스크를 섞지 않는다.
- ⚠️ **`image?`는 옵셔널이다** — `CardView` 조립처는 `toCardView`(card.ts:183)와 `toComingCardView`(card.ts:223) **둘**이고, 한쪽을 빠뜨려도 `tsc`는 안 잡고 폴백 때문에 화면도 안 깨진다(`/coming`만 조용히 이모지로 남는다). 누락은 테스트가 잡는다 (Task 4).
- **프롬프트 8블록 동결** — 게이트 1 이후 슬롯 4개(`COMPOSITION`/`PARTS`/`COLOUR_NOTE`/`ITEM_KR`) 외의 문장은 한 글자도 바꾸지 않는다. 바뀌지 않는 블록이 70장을 한 세트로 묶는 유일한 장치다.
- **에셋 규격 동결** (스펙 §3·§4) — 자연색 무보정 · 그림자 0 · 외곽선 0 · 그라데이션 0 · 투명배경 · 점유율 80% · 288×288 WebP · `public/assets/produce/{image}.webp`. 흰 피사체가 순백 카드에 녹아도 **자연색 범위 안에서 음영을 깊게** 재생성한다 — 외곽선·색보정으로 풀지 않는다.
- **씨앗형 — CI·크론 없음.** 생성·후처리는 1회성 로컬 작업. `fetch:*` 류 상시 파이프라인을 만들지 않는다.
- **원본 1024 PNG는 커밋하지 않는다** (70장 ≈ 수십 MB). 커밋 대상은 288 WebP뿐. 진실의 원천은 동결 프롬프트(notes에 기록)와 커밋된 WebP다.
- **재생성 시 파일명을 바꾼다** — `peach` → `peach-2`처럼 리네임하고 `produce.json`의 `image`를 같이 고친다(정적 호스트 캐시가 옛 그림을 계속 주는 사고를 파일명으로 막는다).
- **임의값 금지** — `w-[96px]` 불가(96px는 spacing 스케일 밖, 최대 `--spacing-3xl`=3rem). 크기의 유일한 권위는 `<img width={96} height={96}>` 속성(CLS 방지 겸용)이고, 추가 CSS가 필요하면 스케일 밖 기하(스타일 경계 기준 3)이므로 `ProduceCard.module.css`로 간다.
- **경로는 `${import.meta.env.BASE_URL}assets/produce/…`** — BASE_URL은 트레일링 슬래시로 정규화된다(`src/data.ts:4-8`의 기존 관례). `/assets/…`로 하드코드하면 `/jecheori/` 하위경로 배포가 깨진다.
- **`alt=""` + 이모지 폴백 `aria-hidden="true"`** — 품목명이 바로 옆 `<summary>`에 있어 alt를 채우면 이중 낭독이다. 기존 이모지도 aria-hidden이 없어 "복숭아 복숭아"로 읽히는 결함이 있다 — 이번에 같이 고친다.
- `sharp`는 **devDependency** — 런타임 의존성 추가 아님(공개 페이지는 여전히 무추적·경량·외부요청 없음).
- 사용자 문구 한국어·담백·느낌표 금지 (이 작업의 카피 변경은 없음. alt·aria는 카피가 아니다).
- 순수 로직 테스트는 `tests/`에서 `'../src/…'` 임포트, 컴포넌트 테스트는 `src/components/*.test.tsx` + `// @vitest-environment jsdom`. `getByRole('img')` 금지 사유는 Task 6 참고.
- 작업 브랜치: `feat/produce-images` (Task 1에서 main 기준 생성. `feat/tailwind-migration`이 미머지 상태면 머지 후 시작한다 — `ProduceCard.module.css`·`global.css`를 양쪽이 만진다).

---

## 페이즈 지도 — 게이트가 어디 있나

```
Phase 0  (코드)          Task 1   후처리 헬퍼 (80% 점유율 정규화)
Phase A  (사람·로컬)     Task 2   앵커 4장 생성·검수·용량 실측
                                  ⛔ 게이트 1: 앵커 사인오프 + 프롬프트 동결 + 생성기 확정
Phase B  (시안)          Task 3   실물 앵커로 표지 레이아웃 시안 2~3안
                                  ⛔ 게이트 2: 레이아웃 사인오프
Phase C  (코드)          Task 4   types + card.ts 두 조립처
                         Task 5   앵커 4장 배치 + produce.json + 에셋 존재 테스트
                         Task 6   ProduceCard 이미지 슬롯 + eager + 확정 레이아웃
                         Task 7   story-utils + 스토리 1쌍
Phase D  (사람·반복)     Task 8   나머지 66장 양산 — 배치별 생성→검수→배치→실화면
Phase E  (문서·마감)     Task 9   DESIGN.md 개정 3건 + 결정 기록 + 제품-동작-지도
                         Task 10  최종 브라우저 실측 3경로 + 스크린샷 사인오프
```

Task 1이 Phase A보다 앞인 이유: 게이트 1의 "용량 실측"이 정규화된 WebP를 요구한다 — 헬퍼가 먼저 있어야 앵커를 실측할 수 있다.

---

### Task 1: 후처리 헬퍼 — 점유율 80% 정규화 (Phase 0)

70장의 피사체 크기가 제각각이면 카드를 스크롤할 때 그림이 커졌다 작아졌다 춤춘다. AI는 이걸 맞춰주지 않으므로 후처리에서 강제한다(스펙 §7). 파이프라인: 알파 정리(헤일로 제거) → 피사체 bbox 트림 → 여백 10% 재부여 → 288×288 WebP.

**Files:**
- Create: `scripts/lib/normalize-image.mjs` (순수 변환 — 테스트 대상)
- Create: `scripts/normalize-produce-images.mjs` (CLI 래퍼)
- Test: `tests/normalize-image.test.js`
- Modify: `package.json` (devDependency `sharp`)
- Modify: `CLAUDE.md` 명령어 절에 한 줄 추가

**Interfaces:**
- Produces: `normalizeImage(input: Buffer): Promise<Buffer>` — 1024 투명 PNG를 받아 288 WebP를 낸다. CLI: `node scripts/normalize-produce-images.mjs <원본 PNG 폴더> [출력 폴더=public/assets/produce]`. Task 2·8이 이 CLI를 쓴다.

- [ ] **Step 1: 브랜치 + 의존성**

```bash
git checkout main && git pull && git checkout -b feat/produce-images
npm install -D sharp
```

- [ ] **Step 2: 실패하는 테스트 작성** — `tests/normalize-image.test.js`:

```js
import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import { normalizeImage, SIZE } from '../scripts/lib/normalize-image.mjs'

/** 피사체(불투명 사각형)를 치우쳐 놓은 1024 투명 PNG를 합성한다. */
async function syntheticPng({ w = 500, h = 300, left = 37, top = 91, extra = [] } = {}) {
  const subject = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } },
  }).png().toBuffer()
  return sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: subject, left, top }, ...extra]).png().toBuffer()
}

/** 출력물에서 불투명(alpha>0) 픽셀의 bbox를 잰다. */
async function bbox(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * info.channels + 3] > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
  return { w: maxX - minX + 1, h: maxY - minY + 1, minX, minY }
}

describe('normalizeImage — 점유율 80% 정규화 (스펙 §7)', () => {
  test('288×288 WebP(알파)를 낸다', async () => {
    const out = await normalizeImage(await syntheticPng())
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(SIZE)
    expect(meta.height).toBe(SIZE)
    expect(meta.hasAlpha).toBe(true)
  })

  test('피사체 긴 변이 프레임의 ~80%, 중앙 배치 — 원본 위치와 무관', async () => {
    const out = await normalizeImage(await syntheticPng({ left: 37, top: 91 }))
    const b = await bbox(out)
    // 긴 변 500 → 캔버스 625 → 288로 축소하면 500/625*288 ≈ 230px (80%)
    expect(b.w).toBeGreaterThanOrEqual(228)
    expect(b.w).toBeLessThanOrEqual(234)
    // 중앙: 좌우 여백이 같다 (±2px — 리사이즈 보간 오차)
    expect(Math.abs(b.minX - (SIZE - b.w) / 2)).toBeLessThanOrEqual(2)
  })

  test('알파 헤일로(alpha<16)는 피사체로 치지 않는다 — bbox가 헤일로에 끌려가지 않는다', async () => {
    const halo = await sharp({
      create: { width: 4, height: 4, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.03 } },
    }).png().toBuffer()
    const out = await normalizeImage(
      await syntheticPng({ extra: [{ input: halo, left: 1010, top: 1010 }] }),
    )
    const b = await bbox(out)
    expect(b.w).toBeGreaterThanOrEqual(228) // 헤일로가 bbox에 들어갔다면 피사체가 훨씬 작아진다
  })

  test('완전 투명이면 조용히 넘기지 않고 throw', async () => {
    const empty = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png().toBuffer()
    await expect(normalizeImage(empty)).rejects.toThrow()
  })
})
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run tests/normalize-image.test.js`
Expected: FAIL — `normalize-image.mjs` 모듈 없음.

- [ ] **Step 4: 구현** — `scripts/lib/normalize-image.mjs`:

```js
import sharp from 'sharp'

export const SIZE = 288
export const OCCUPANCY = 0.8
/** 이 미만의 알파는 헤일로(생성기가 흔히 남기는 반투명 테두리)로 보고
 *  완전 투명 처리 + bbox 계산에서 제외한다. */
const ALPHA_FLOOR = 16

/** 1024 투명 PNG → 알파 정리 → 피사체 bbox 트림 → 여백 10% 재부여 → 288 WebP.
 *  점유율 80% 통일이 여기서 강제된다(스펙 §7) — AI는 프레이밍을 맞춰주지 않는다. */
export async function normalizeImage(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = (y * width + x) * channels + 3
      if (data[a] < ALPHA_FLOOR) { data[a] = 0; continue }
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  // 모르는 형태를 만나면 조용히 넘기지 않고 실패한다 (KAMIS 어댑터와 같은 결)
  if (maxX < 0) throw new Error('피사체가 없다 — 완전 투명 이미지')
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const side = Math.max(w, h)
  const canvas = Math.round(side / OCCUPANCY) // 긴 변 80% → 사방 여백 10%
  const left = Math.floor((canvas - w) / 2)
  const top = Math.floor((canvas - h) / 2)
  const subject = await sharp(data, { raw: info })
    .extract({ left: minX, top: minY, width: w, height: h })
    .png()
    .toBuffer()
  return sharp(subject)
    .extend({
      top,
      bottom: canvas - h - top,
      left,
      right: canvas - w - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(SIZE, SIZE)
    .webp()
    .toBuffer()
}
```

`scripts/normalize-produce-images.mjs`:

```js
#!/usr/bin/env node
// 품목 도판 후처리 — 1회성 로컬 작업 (씨앗형, CI 없음. 스펙 §7).
// 사용: node scripts/normalize-produce-images.mjs <원본 PNG 폴더> [출력 폴더]
import { mkdirSync, readdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { normalizeImage } from './lib/normalize-image.mjs'

const [inDir, outDir = 'public/assets/produce'] = process.argv.slice(2)
if (!inDir) {
  console.error('사용: node scripts/normalize-produce-images.mjs <원본 PNG 폴더> [출력 폴더]')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
for (const f of readdirSync(inDir).filter((f) => f.endsWith('.png'))) {
  const out = join(outDir, `${basename(f, '.png')}.webp`)
  const webp = await normalizeImage(await readFile(join(inDir, f)))
  await writeFile(out, webp)
  console.log(`${out}  ${(webp.length / 1024).toFixed(1)}KB`)
}
```

- [ ] **Step 5: 통과 확인 + 전체 게이트**

Run: `npx vitest run tests/normalize-image.test.js` → PASS
Run: `npm test && npx tsc --noEmit` → PASS (기존 테스트 무영향)

- [ ] **Step 6: CLAUDE.md 명령어 절에 추가** — `npm run subset:fonts` 항목 아래:

```markdown
- `node scripts/normalize-produce-images.mjs <폴더>` — 품목 도판 후처리 (1024 PNG → 점유율 80% 정규화 → 288 WebP, `public/assets/produce/`). 1회성 로컬, CI 없음
```

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/normalize-image.mjs scripts/normalize-produce-images.mjs tests/normalize-image.test.js package.json package-lock.json CLAUDE.md
git commit -m "feat: 품목 도판 후처리 헬퍼 — 점유율 80% 정규화 → 288 WebP"
```

---

### Task 2: 앵커 4장 — 생성·검수·용량 실측 → ⛔ 게이트 1 (Phase A)

**앵커 4장:** `peach`(과일) · `mackerel`(수산) · `cabbage`(채소) · `hanwoo-sirloin`(축산) — 형태 난이도와 도판 문법이 서로 다른 넷. **생성·검수·재생성 판단은 사람의 작업이다.** 에이전트가 할 수 있는 것은 프롬프트 조립과 기록뿐이다.

**Files:**
- Create: `docs/superpowers/notes/2026-08-22-produce-image-anchors.md` (프롬프트 4개 · 검수 결과 · 용량 실측 · 생성기 비교 · 동결 기록)
- Create (게이트 1 통과 후): `public/assets/produce/{peach,mackerel,cabbage,hanwoo-sirloin}.webp`

**Interfaces:**
- Produces: 동결된 8블록 프롬프트 + 확정 생성기 + 앵커 WebP 4장. Task 3(시안)·Task 5(배치)·Task 8(양산)이 전부 이것에 의존한다.

- [ ] **Step 1 (에이전트): 앵커 프롬프트 4개 조립** — 스펙 §5.1의 8블록 포맷에 부록 A의 해당 4행을 넣어 notes 파일에 기록한다. 슬롯 4개 외의 문장은 스펙에서 **그대로 복사**한다(한 글자도 바꾸지 않는다). 예: `peach`의 Subject 블록은

```
Subject
two whole peaches, one upright and one tilted beside it — with two attached leaves
and a short cut stem. Korean market produce, 복숭아.
```

  나머지 Style/Colour/View/Light/Background/Do not include/Output 블록은 스펙 §5.1 원문 그대로, Colour의 `{COLOUR_NOTE}`만 각 행의 값으로. `mackerel`·`cabbage`·`hanwoo-sirloin`도 부록 A의 자기 행(수산·채소·축산 표)으로 동일하게 조립한다.

- [ ] **Step 2 (사람): 두 생성기에서 각 4장 생성** — Gemini 계열(Nano Banana)과 GPT Image 양쪽에서 앵커 4장씩, 1024×1024 투명 PNG. (Midjourney는 투명배경 불가로 제외 — 스펙 §5.2.)

- [ ] **Step 3 (사람): 검수 게이트 6항목** (스펙 §6) — ①배경 진짜 투명 ②그림자 0 ③점유율(잘림 없음 — 80% 교정은 후처리 몫) ④**96px 축소해서** 읽히는가 ⑤순백 위 윤곽(특히 `hanwoo-sirloin`의 크림 지방캡) ⑥혼동군 — 앵커 단계에선 비교 상대가 없어 6번은 양산(Task 8)에서 본다. 걸리면 프롬프트를 고치고 재생성 — 수정 이력을 notes에 남긴다.

- [ ] **Step 4: 후처리 + 용량 실측**

```bash
node scripts/normalize-produce-images.mjs <앵커 원본 폴더> /tmp/anchors-out
ls -l /tmp/anchors-out
```

  장당 KB를 notes에 기록하고 스펙 §4의 총용량 추정(1.0–1.4MB)을 실측 기반으로 갱신한다. 비늘(mackerel)·마블링(hanwoo-sirloin)은 25–35KB로 튈 수 있다 — 추정만 믿지 않는다.

- [ ] **Step 5: ⛔ 게이트 1 — STOP. 사인오프 요청.**

  사람에게 제시할 것: (a) 두 생성기의 앵커 4장(96px 축소본 포함) (b) 6점 검수 결과 (c) 용량 실측 (d) 생성기 추천과 근거. **여기서 멈춘다.** 사인오프 없이 Task 3 이후를 시작하지 않는다. 통과 기준: 앵커 4장 승인 + 생성기 확정 + 프롬프트 동결 선언.

- [ ] **Step 6 (사인오프 후): 동결 기록 + 앵커 커밋**

  notes에 확정 생성기·동결 프롬프트 최종본·레퍼런스 첨부 문구(스펙 §5.2의 "Match the flattening level…" 원문)를 기록. 확정 생성기의 앵커 4장을 배치:

```bash
node scripts/normalize-produce-images.mjs <확정 앵커 폴더>   # → public/assets/produce/
git add docs/superpowers/notes/2026-08-22-produce-image-anchors.md public/assets/produce
git commit -m "feat: 앵커 도판 4장 확정 — 프롬프트 동결·생성기 확정 (게이트 1 통과)"
```

---

### Task 3: 표지 레이아웃 시안 2~3안 → ⛔ 게이트 2 (Phase B)

96px 도판이 들어오면 표지 행이 다시 짜여야 한다 — 현행 `summaryRow`(`ProduceCard.module.css:32`, `ProduceCard.tsx:43-58`)는 27px 인라인 이모지 전제다. **이 플랜은 레이아웃을 정하지 않는다.** 진짜 앵커 그림을 얹은 시안 2~3안을 만들어 사인오프를 받는다(CLAUDE.md UI/UX 결정 규칙 — 상상 속 그림에 맞춰 짜면 두 번 짠다).

**Files:**
- Create: `docs/prototypes/2026-08-22-card-cover-layout.html` (기존 `docs/prototypes/2026-08-22-asset-concepts.html`과 같은 결 — 브라우저로 여는 독립 HTML)

**Interfaces:**
- Produces: 사인오프된 레이아웃 확정안(프로토타입 파일 상단 주석에 결정 기록). Task 6이 이것을 명세로 구현한다.

- [ ] **Step 1: 렌즈 스킬 열기** — `DESIGN.md` 필독 후 `frontend-design`(미감·비주얼)로 시안을 만들고 `impeccable`(위계·인지부하) 렌즈로 자체 리뷰한다 (CLAUDE.md UI/UX 결정 규칙 1).

- [ ] **Step 2: 시안 2~3안 작성** — 앵커 4장 실물(`../../public/assets/produce/*.webp` 상대 경로)을 얹은 카드 표지를 안별로 나란히. 시안이 지켜야 할 제약(스펙 §10 — 이건 결정이 아니라 제약이다):
  - 콘텐츠 폭 ≈ 384px. 96px 도판이 그중 1/4을 먹는다
  - 표지에 남아야 할 것 전부: 이름 · 품종(`kind`) · 절정 점(`PeakDot`) · 제철 띠(`SeasonStrip`) · 가격 블록(`PriceBlock` — 큰 숫자 + 기준선) · 손글씨 한마디(`why`). **하나도 펼침 영역으로 내리지 않는다**
  - 마스킹테이프(`::before`)·홀짝 기울기·crisp 모서리 유지
  - `<summary>` 클릭 타깃이 행 전체 — 이미지가 클릭을 삼키지 않아야 한다
  - 축산 카드는 `SeasonStrip`이 없다(`ProduceCard.tsx:55`) — 그 변형의 균형도 각 안에 포함 (`hanwoo-sirloin` 앵커로)

- [ ] **Step 3: 브라우저 확인** — 384px 뷰포트로 열어 앵커 4장 × 각 안을 실측. 가격 없는 카드(취소선·칩 없음)와 whyNow 긴 줄 케이스도 넣어 본다.

- [ ] **Step 4: ⛔ 게이트 2 — STOP. 사인오프 요청.**

  **여기서 멈춘다.** 확정안 번호와 조정 지시를 받은 뒤에만 Task 6의 레이아웃 구현을 시작한다. 확정 내용을 프로토타입 파일 상단 주석에 기록.

- [ ] **Step 5: Commit**

```bash
git add docs/prototypes/2026-08-22-card-cover-layout.html
git commit -m "docs: 카드 표지 레이아웃 시안 — 게이트 2 확정안 기록"
```

---

### Task 4: `image` 필드 — types + card.ts 두 조립처 (Phase C)

**Files:**
- Modify: `src/types.ts` (`ProduceProfile`, 18-38행 부근)
- Modify: `src/card.ts` (`CardView` 54-66행 · `toCardView` 183행 · `toComingCardView` 223행)
- Test: `tests/card.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 타입·파생)
- Produces: `ProduceProfile.image?: string`, `CardView.image?: string` (`emoji`는 유지 — 둘 다 넘긴다). Task 5(에셋 테스트)·Task 6(ProduceCard)·Task 7(story-utils)이 이 필드를 소비한다. `src/app.ts`는 **변경 없음** — 세 빌더(`buildAppView`·`buildComingView`·`buildLivestockView`)가 두 조립처를 타므로 자동으로 덮인다.

- [ ] **Step 1: 실패하는 테스트** — `tests/card.test.ts` 끝에 추가 (기존 `profile`·`pick` 픽스처 재사용):

```ts
describe('CardView.image — 조립처가 둘이다', () => {
  test('toCardView가 profile.image를 넘긴다', () => {
    const card = toCardView(pick({ profile: { ...profile, image: 'peach' } }), 7)
    expect(card.image).toBe('peach')
    expect(card.emoji).toBe('🍑') // 이모지는 폴백으로 유지 — 지우지 않는다
  })

  test('image 없는 프로필은 undefined — 점진 도입 기간의 이모지 폴백', () => {
    expect(toCardView(pick(), 7).image).toBeUndefined()
  })

  test('toComingCardView도 image를 넘긴다 — 옵셔널이라 이쪽을 빠뜨려도 tsc가 못 잡고 /coming만 조용히 이모지로 남는다', () => {
    const card = toComingCardView({ ...profile, image: 'peach' }, 8, 7, null)
    expect(card.image).toBe('peach')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/card.test.ts`
Expected: FAIL — `card.image`가 `undefined` (그리고 `tsc`로 돌리면 `image`가 `ProduceProfile`에 없다는 타입에러 — 이게 옵셔널 추가 후엔 사라지므로 지금이 마지막으로 타입이 잡아주는 순간이다).

- [ ] **Step 3: 구현** — `src/types.ts`의 `ProduceProfile`에 `emoji` 아래:

```ts
  /** 품목 도판 파일 basename — public/assets/produce/{image}.webp (스펙 2026-08-22).
   *  없으면 카드가 emoji로 폴백한다(점진 도입). 여러 항목이 한 장을 공유할 수 있다
   *  (한우 등급 3항목 → 1장, 부록 B). 파일이 실제로 커밋된 뒤에만 채운다 —
   *  tests/produce-images.test.ts가 양방향 동기화를 강제한다. */
  image?: string
```

`src/card.ts`의 `CardView`에 `emoji: string` 아래 `image?: string` 추가(주석: `/** 도판 basename — 없으면 emoji 폴백. ⚠️ 조립처 둘(toCardView·toComingCardView) 모두 채울 것 */`). `toCardView`(190행 반환 객체)와 `toComingCardView`(231행 반환 객체) **둘 다**에 `image: profile.image,`를 `emoji` 다음 줄로 추가.

- [ ] **Step 4: 통과 + 게이트**

Run: `npx vitest run tests/card.test.ts` → PASS
Run: `npm test && npx tsc --noEmit` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/card.ts tests/card.test.ts
git commit -m "feat: ProduceProfile/CardView에 image 필드 — 두 조립처 모두 전달"
```

---

### Task 5: 앵커 배치 확인 + produce.json + 에셋 존재 테스트 (Phase C)

오타 하나가 96px 깨진 이미지로 나가는 걸 막는다. 선례는 `tests/font-coverage.test.ts` — 조용한 폴백 대신 시끄러운 실패.

**Files:**
- Test: `tests/produce-images.test.ts`
- Modify: `public/data/produce.json` (앵커 관련 6항목에 `image` 추가)

**Interfaces:**
- Consumes: Task 2가 커밋한 `public/assets/produce/*.webp` 4장, Task 4의 `ProduceProfile.image?`
- Produces: `produce.json` ↔ 파일 양방향 동기화 가드. Task 8의 배치별 "채우면 테스트가 지켜준다" 루프가 여기 의존한다.

- [ ] **Step 1: 실패하는 테스트** — `tests/produce-images.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import type { ProduceProfile } from '../src/types'

const profiles: ProduceProfile[] = JSON.parse(
  readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
)
const dir = fileURLToPath(new URL('../public/assets/produce/', import.meta.url))
const referenced = [...new Set(profiles.flatMap((p) => (p.image ? [p.image] : [])))]
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.webp')) : []

// 선례: tests/font-coverage.test.ts — 조용한 폴백 대신 시끄러운 실패.
// image 오타는 tsc도 폴백도 못 잡는다(옵셔널 + 이모지 폴백) — 여기서만 잡힌다.
describe('품목 도판 ↔ produce.json 동기화', () => {
  test('produce.json이 가리키는 도판 파일이 전부 실제로 있다', () => {
    const missing = referenced.filter((image) => !existsSync(join(dir, `${image}.webp`)))
    expect(missing).toEqual([])
  })

  test('참조 없는 고아 파일이 없다 (재생성 리네임 후 옛 파일 잔류 방지)', () => {
    const need = new Set(referenced)
    const orphans = files.filter((f) => !need.has(f.replace(/\.webp$/, '')))
    expect(orphans).toEqual([])
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/produce-images.test.ts`
Expected: FAIL — 고아 검사: 앵커 4장이 있는데 `produce.json`엔 아직 아무 참조가 없다.

- [ ] **Step 3: produce.json 앵커 항목 채우기** — 부록 A·B 기준, `emoji` 필드 다음에:
  - `peach` → `"image": "peach"`
  - `mackerel` → `"image": "mackerel"`
  - `cabbage` → `"image": "cabbage"`
  - `hanwoo-sirloin-1pp` / `-1p` / `-1` 3항목 모두 → `"image": "hanwoo-sirloin"` (부록 B 공유 — 등급은 그림으로 가르지 않는다)

- [ ] **Step 4: 통과 + 게이트**

Run: `npx vitest run tests/produce-images.test.ts tests/produce.test.ts` → PASS
Run: `npm test && npx tsc --noEmit` → PASS

- [ ] **Step 5: Commit**

```bash
git add tests/produce-images.test.ts public/data/produce.json
git commit -m "feat: 에셋 존재 양방향 가드 + 앵커 4장 produce.json 연결"
```

---

### Task 6: ProduceCard — 이미지 슬롯 + `eager` + 확정 레이아웃 (Phase C)

**Files:**
- Modify: `src/components/ProduceCard.tsx` (13행 시그니처, 43-58행 summary 마크업)
- Modify: `src/components/ProduceCard.module.css` (확정안의 스케일 밖 기하만 — 평범한 선언은 JSX 유틸리티)
- Modify: `src/components/App.tsx` (110-114행 목록), `src/components/Coming.tsx` (25-29행), `src/components/Livestock.tsx` (27-31행)
- Test: `src/components/ProduceCard.test.tsx`

**Interfaces:**
- Consumes: `CardView.image?` (Task 4), 게이트 2 확정 레이아웃 (Task 3), 앵커 WebP (Task 2/5)
- Produces: `ProduceCard({ card, eager = false }: { card: CardView; eager?: boolean })` — 세 목록 렌더가 `eager`를 넘긴다.

- [ ] **Step 1: 실패하는 테스트** — `ProduceCard.test.tsx`에 추가:

```tsx
// ⚠️ getByRole('img') 금지: alt=""인 <img>는 접근성 트리에서 빠져 그 쿼리에 안 잡히고,
// role="img"는 이미 SeasonStrip(SeasonStrip.tsx:14)이 점유해 기존 제철 띠 테스트와 충돌한다.
// 도판은 container.querySelector('img')로 지목한다.
describe('ProduceCard 도판', () => {
  const withImage: CardView = { ...base, image: 'tomato' }

  test('image 있으면 <img> — alt="" · 96px 속성 · 기본 lazy', () => {
    const { container } = render(<ProduceCard card={withImage} />)
    const img = container.querySelector('img')!
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe('/assets/produce/tomato.webp')
    expect(img.getAttribute('alt')).toBe('') // 품목명이 바로 옆에 있다 — 채우면 이중 낭독
    expect(img.getAttribute('width')).toBe('96') // 크기의 유일한 권위 (CLS 방지)
    expect(img.getAttribute('height')).toBe('96')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  test('eager면 loading="eager" + fetchpriority="high"', () => {
    const { container } = render(<ProduceCard card={withImage} eager />)
    const img = container.querySelector('img')!
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
  })

  test('image 없으면 이모지 폴백 — aria-hidden으로 이중 낭독 방지(기존 결함 수정)', () => {
    const { container, getByText } = render(<ProduceCard card={base} />)
    expect(container.querySelector('img')).toBeNull()
    expect(getByText('🍅').getAttribute('aria-hidden')).toBe('true')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/ProduceCard.test.tsx`
Expected: 신규 3케이스 FAIL (`eager` prop 없음 → tsc 에러이기도 하다), 기존 케이스 PASS 유지.

- [ ] **Step 3: 슬롯 구현** — 시그니처를 `export function ProduceCard({ card, eager = false }: { card: CardView; eager?: boolean })`로. 46행의 이모지 `<span>`을 교체:

```tsx
{card.image ? (
  <img
    src={`${import.meta.env.BASE_URL}assets/produce/${card.image}.webp`}
    width={96}
    height={96}
    alt="" // 품목명이 바로 옆(<summary>)에 있다 — 장식이 아니라 중복이라 비운다
    loading={eager ? 'eager' : 'lazy'}
    fetchPriority={eager ? 'high' : undefined}
  />
) : (
  <span className={styles.emoji} aria-hidden="true">{card.emoji}</span>
)}
```

- [ ] **Step 4: 세 목록에 eager 전달** — 첫 화면 카드까지 lazy면 96px 빈 칸이 보였다가 채워진다. **앞 2장에만** `true`:

  - `App.tsx`: `{shown.map((c, i) => (<ProduceCard key={c.name} card={c} eager={i < 2} />))}`
  - `Livestock.tsx`: `{cards.map((c, i) => (<ProduceCard key={c.name} card={c} eager={i < 2} />))}`
  - `Coming.tsx`: `months.map((m, mi) => …` 로 바꾸고 `{m.items.map((card, i) => (<ProduceCard key={card.name} card={card} eager={mi === 0 && i < 2} />))}` — 첫 월 섹션의 앞 2장만.

- [ ] **Step 5: 확정 레이아웃 구현** — **게이트 2 확정안이 명세다** (이 플랜은 레이아웃을 정하지 않았다). `ProduceCard.tsx` 43-58행의 표지 마크업과 `ProduceCard.module.css`를 확정안대로 조정한다. 지킬 것:
  - 스케일 밖 기하(96px 관련 정렬·수축 방지 등)는 **모듈**로, 스케일 안 평범한 선언은 JSX 유틸리티로 (스타일 경계 기준 3 · 임의값 금지)
  - 같은 속성을 모듈·유틸리티 양쪽에서 건드리지 않는다
  - 기존 컴포넌트 테스트의 시맨틱(요소 role·텍스트)을 깨지 않는다 — 깨지면 마크업이 아니라 테스트 셀렉터가 표시 구조에 과결합된 것인지 먼저 본다
  - `SeasonHint`는 손대지 않는다 — 목록 줄은 이모지 유지 (스펙 §8.3)

- [ ] **Step 6: 통과 + 게이트**

Run: `npx vitest run src/components/ProduceCard.test.tsx` → PASS (기존 + 신규 전부)
Run: `npm test && npx tsc --noEmit` → PASS

- [ ] **Step 7: 브라우저 실측** — `npm run dev` 후 세 경로 전부:
  - `/` — 복숭아 카드에 도판(8월이면 제철), 나머지는 이모지 폴백 혼재(점진 도입 — 의도된 상태)
  - `/coming` — 조립처 2번(`toComingCardView`)이 실제로 이어졌는지 눈으로 확인
  - `/livestock` — 한우 등심 3등급 카드가 같은 `hanwoo-sirloin.webp`를 공유하는지
  - 공통: 순백 카드 위 알파 경계 헤일로 없음 · 스크롤 중 lazy 로드 레이아웃 안 튐(width/height 속성) · `<summary>` 클릭이 이미지 위에서도 카드를 펼침 · 마스킹테이프·기울기·crisp 모서리 유지 · 카드 펼침 리빌 모션 정상

- [ ] **Step 8: Commit**

```bash
git add src/components/ProduceCard.tsx src/components/ProduceCard.module.css src/components/ProduceCard.test.tsx src/components/App.tsx src/components/Coming.tsx src/components/Livestock.tsx
git commit -m "feat(ProduceCard): 96px 도판 슬롯 + eager 로딩 + 표지 레이아웃 개편 (게이트 2 확정안)"
```

---

### Task 7: story-utils + 도판/폴백 스토리 1쌍 (Phase C)

`src/story-utils.tsx`의 `toProfile`(127-147행)은 `ProduceProfile`을 수기 조립한다 — `image`를 안 옮기면 뷰 상태 탐색기에서 영영 안 보이고, **옵셔널이라 에러도 없다.**

**Files:**
- Modify: `src/story-utils.tsx` (`CardKnobs` 57-84행 · `CARD_KNOBS_DEFAULT` 86-109행 · `CARD_ARG_TYPES` 111-122행 · `toProfile` 127-147행)
- Modify: `src/components/ProduceCard.stories.tsx`

**Interfaces:**
- Consumes: `ProduceProfile.image?` (Task 4), 앵커 WebP (Task 2)
- Produces: `CardKnobs.image: string` (`''` = 없음 → 이모지 폴백) — 노브로 도판/폴백을 오갈 수 있다.

- [ ] **Step 1: 노브 추가** — `CardKnobs`에:

```ts
  /** 도판 basename. ''이면 없음 → 이모지 폴백(점진 도입 기간의 실제 상태). */
  image: string
```

  `CARD_KNOBS_DEFAULT`에 `image: ''` (주석: `// 감자 도판(potato)은 양산 후 존재 — 그 전까지 기본 카드는 정직하게 이모지 폴백`), `CARD_ARG_TYPES`에 `image: { control: 'text' }`, `toProfile` 반환 객체의 `emoji` 아래에 `image: k.image || undefined,`.

- [ ] **Step 2: 스토리 1쌍** — `ProduceCard.stories.tsx`에 추가:

```tsx
/** 도판 — 앵커 peach 실물 파일. Storybook도 Vite publicDir을 그대로 쓰므로
 *  public/assets/produce가 서빙된다(.storybook/main.ts는 tanstack 플러그인만 걷어낸다 —
 *  staticDirs 설정 불필요, storybook-static/data가 증거). */
export const 도판: Story = {
  args: {
    name: '복숭아', emoji: '🍑', kindName: '', category: 'fruit', image: 'peach',
    price: 12000, monthAgo: 13500, yearAgo: 11000, unitQuantity: 1, unitMeasure: 'kg',
    whyNow: '7~8월이 노지 복숭아의 절정이에요',
  },
}

/** 이모지 폴백 — image가 빈 품목. 70장이 다 될 때까지 화면에 실재하는 상태(점진 도입). */
export const 이모지폴백: Story = { args: { image: '' } }
```

- [ ] **Step 3: 확인**

Run: `npm run storybook`
Expected: `카드/ProduceCard/도판`에 복숭아 도판이 확정 레이아웃으로, `이모지폴백`에 이모지가 보인다. `image` 노브에 `peach`/`''`를 오가며 폴백 전환 확인.

Run: `npm test && npx tsc --noEmit` → PASS

- [ ] **Step 4: Commit**

```bash
git add src/story-utils.tsx src/components/ProduceCard.stories.tsx
git commit -m "feat(storybook): image 노브 + 도판/이모지폴백 스토리 1쌍"
```

---

### Task 8: 나머지 66장 양산 — 배치 반복 (Phase D, 사람·에이전트 협업)

코드가 서 있으므로(Task 4-7) 뽑는 족족 실화면에서 검수한다. **생성·검수 판단은 사람**, 프롬프트 조립·후처리 실행·produce.json 갱신·테스트는 에이전트가 거든다.

**Files:**
- Create: `docs/superpowers/notes/2026-08-22-produce-image-prompts.md` (66행 프롬프트 일람)
- Create: `public/assets/produce/*.webp` (배치별 누적, 최종 70장)
- Modify: `public/data/produce.json` (배치별 `image` 채우기)

**Interfaces:**
- Consumes: 동결 프롬프트 + 확정 생성기 + 앵커 4장(레퍼런스 첨부용), `normalize-produce-images.mjs`, `tests/produce-images.test.ts`
- Produces: 84 프로필 전부 `image` 보유 (도판 70종 — 부록 B 공유 매핑 적용).

- [ ] **Step 1 (에이전트): 66행 프롬프트 일괄 조립** — 동결된 8블록 × 부록 A의 나머지 66행(앵커 4행 제외)을 notes 파일로. 각 프롬프트 앞에 공통 지시를 명기: **매 생성마다 앵커 4장을 레퍼런스 이미지로 첨부**하고 스펙 §5.2의 문장(“Match the flattening level, edge quality, lighting and framing of the attached reference plates exactly. Only the subject changes.”)을 함께 보낸다.

- [ ] **Step 2 (반복, 배치 권장 순서: 과일 11 → 채소 27 → 수산 15 → 축산 13):** 배치마다:
  1. **(사람)** 생성 — 1024 투명 PNG
  2. **(사람)** 검수 6항목 (스펙 §6). 특히:
     - **흰 피사체 위험군** — `milk-white` · `hairtail` · `dried-anchovy` · `chicken-broiler` · `garlic` · `napa-cabbage`: 순백 위 윤곽 확인, 녹으면 자연색 범위 안 음영 심화로 재생성
     - **혼동군을 96px로 나란히**: 대파·쪽파 / 배추·얼갈이 / 무·열무 / 부추·미나리·쪽파 / 포도·샤인머스캣 / 한우 등심·설도·양지 / 한우 갈비·수입 소갈비 / 고등어·삼치 (가르는 기준은 스펙 §6 표)
  3. 후처리: `node scripts/normalize-produce-images.mjs <배치 폴더>`
  4. `produce.json`의 해당 항목에 `image` 추가 — **부록 B 공유 매핑 준수**: 한우 5부위 각 3등급 → 부위당 1장(`hanwoo-tenderloin`·`hanwoo-sirloin`·`hanwoo-round`·`hanwoo-brisket`·`hanwoo-rib`), `imported-beef-rib-us/-au` → `imported-beef-rib`, `imported-beef-ribmeat-us/-au` → `imported-beef-ribmeat`, `pork-belly`/`imported-pork-belly` → `pork-belly`, `egg-10`/`egg-30` → `egg`. 나머지는 `image` = 자기 `id`.
  5. Run: `npm test` → `produce-images` 동기화 가드 PASS 확인
  6. `npm run dev`로 해당 카드가 보이는 경로에서 실화면 스팟 체크 (축산 배치는 반드시 `/livestock`)
  7. Commit: `git add public/assets/produce public/data/produce.json && git commit -m "feat: 품목 도판 — <배치명> N장"`

- [ ] **Step 3: 판단 유보 항목 확인** — 스펙 §12가 열어둔 되돌림: **한우 갈비 vs 수입 소갈비**가 96px에서 정말 갈리는지 나란히 확인하고, 안 갈리면 공유로 되돌린다(70 → 69장, `imported-beef-rib-us/-au`의 `image`를 `hanwoo-rib`으로). 판단 결과를 notes에 한 줄 기록.

- [ ] **Step 4: 완료 판정**

```bash
ls public/assets/produce/*.webp | wc -l           # 70 (또는 §12 되돌림 시 69)
du -sh public/assets/produce                       # 총용량 — 게이트 1 실측 기반 추정과 대조
npm test && npx tsc --noEmit
```

  84 프로필 전부 `image` 보유(고아·결측 0)는 `tests/produce-images.test.ts`가 보증한다.

---

### Task 9: 문서 반영 — DESIGN.md 개정 3건 + 결정 기록 (Phase E)

**Files:**
- Modify: `DESIGN.md` (질감 절 · 색 절 · 컨셉 절 · 결정 기록)
- Modify: `docs/제품-동작-지도.md`
- Modify: `src/global.css` (138행 주석 한 줄)

- [ ] **Step 1: DESIGN.md 개정 3건** (스펙 §9 — 방향이 확정돼 있다):
  1. **질감 절** — "카드 안엔 장식 일러스트를 두지 않는다"에 단서: 식별 도판은 장식이 아니다 — 정보 그래픽(볼드 가격·등락 칩·스파크라인·제철 띠)을 카드에 허용한 것과 같은 논리. 머리말 스케치 1점 규칙은 그대로.
  2. **색 절** — "텍스트·링크·버튼은 오직 쪽빛" 유지. 이미지는 배경 도형(블롭·마스킹테이프·칩 배경)처럼 자연색을 가질 수 있다 — 다만 **이미지 위에 글자를 얹지 않는다.** 그라데이션 금지 유지(에셋이 하드 엣지 색면이라 실질 준수).
  3. **컨셉 절 시그니처 문장** — 그대로 두면 거짓이 된다(카드마다 자연색 96px가 들어오면 화면에서 가장 시끄러운 건 머리말이 아니다). 스펙이 준 방향으로 고친다: *"과감한 **장식**은 여전히 머리말 하나. 카드의 도판은 장식이 아니라 식별 장치이고, 그래서 조용할 의무 대신 읽힐 의무를 진다."*

- [ ] **Step 2: 결정 기록 1건 추가** — 이 저장소 관례(마루부리 제거·차양 전환과 같은 결)대로 한 항목: 이모지의 식별 실패(🥬 5품목·🐟 6품목·김=🍙), 시안 3안 비교와 탈락 이유(인쇄 도판·표본 카드), 접지 그림자 탈락의 구조적 근거(절반은 "놓여 있지" 않다 + 은유가 스티커북으로 이동), 96px·80% 점유율 결정, 스펙 링크.

- [ ] **Step 3: 제품-동작-지도에 §12 표면화 결정 반영** — "안 하는 것"들: 등급을 그림으로 안 가름(한우 15항목 5장 공유) · 공유 기준은 원산지가 아니라 정형(삼겹 공유, 갈비 분리 — Task 8 Step 3의 최종 판단 반영) · 품종을 그림으로 안 가름 · 점진 도입(도판·이모지 혼재 기간) · 다크모드 없음(단일 버전).

- [ ] **Step 4: global.css 138행 주석 갱신** — 카드 이모지가 폴백이 됐다:

```css
  --text-xl: 1.7rem;   /* 최대 디스플레이 — 카드 이모지 폴백·큰 가격 */
```

- [ ] **Step 5: 게이트 + Commit**

Run: `npm test && npx tsc --noEmit` → PASS

```bash
git add DESIGN.md docs/제품-동작-지도.md src/global.css
git commit -m "docs: 도판 전환 반영 — DESIGN.md 개정 3건 + 결정 기록 + 정책 지도"
```

---

### Task 10: 최종 실측 + 스크린샷 사인오프 (Phase E)

- [ ] **Step 1: 전체 게이트**

Run: `npm test && npx tsc --noEmit` → 전부 PASS

- [ ] **Step 2: 빌드 산출물 확인** — `public/` 패스스루가 Vite 자산 디렉터리와 겹치는 이름이라 눈으로 확인한다:

```bash
npm run build
ls dist/client/assets/produce/*.webp | wc -l      # 70 (배포에 실림)
BASE_PATH=/jecheori/ npm run build
grep -o '/jecheori/assets/produce/[a-z0-9-]*\.webp' dist/client/index.html | head -3
```

Expected: 하위경로 빌드의 `<img src>`가 `/jecheori/assets/produce/…`로 프리렌더됨 (BASE_URL 관례가 실제로 작동).

- [ ] **Step 3: 브라우저 최종 실측** — `npm run dev`, 세 경로 전부:
  - `/` — 첫 2장 eager(빈 칸 플래시 없음), 스크롤하며 lazy 로드 중 레이아웃 안 튐, 검색 힌트 줄은 이모지 유지(SeasonHint 무변경), 카테고리 전환·정렬 정상
  - `/coming` — 월 섹션 카드 전부 도판, 마스킹테이프 색(미래 달 계절색)과 도판의 자연색이 충돌하지 않는지
  - `/livestock` — 축산 14장(등급 공유 확인), SeasonStrip 없는 카드의 표지 균형
  - 공통 — 순백 위 헤일로 없음(특히 흰 피사체 6종), 카드 펼침 리빌·레시피 메모·페이지 전환 모션 무회귀, 혼동군 카드를 실화면에서 위아래로 놓고 마지막 확인

- [ ] **Step 4: 스크린샷 사인오프 (사람)** — 세 경로 스크린샷을 제시하고 사인오프를 받는다 (CLAUDE.md: 사용자향 시각 변경은 스크린샷 사인오프). 이건 번호 붙은 게이트가 아니라 이 저장소의 상시 완료 관문이다.

- [ ] **Step 5: 최종 Commit** (잔여 변경이 있으면)

```bash
git add -A && git status   # routeTree.gen.ts가 스테이지에 없는지 확인 (gitignore)
git commit -m "feat: 품목 도판 70장 전환 완료 — 세 경로 실측·사인오프"
```

---

## Self-Review 기록

- **스펙 커버리지:** §3–§5 프롬프트 시스템(Task 2·8) · §6 검수(Task 2·8) · §7 후처리(Task 1) · §8.1 데이터(Task 5·8) · §8.2 타입·파생·표시(Task 4·6) · §8.3 SeasonHint 무변경(Task 6 Step 5 가드) · §8.4 테스트 4종+Storybook(Task 4·5·6·7) · §9 문서(Task 9) · §10 레이아웃(Task 3·6) · §12 표면화(Task 8 Step 3·Task 9 Step 3) · §13 순서·게이트 2개(페이즈 지도).
- **함정 이월 확인:** `image?` 옵셔널 침묵(Global + Task 4) · `getByRole('img')` 충돌(Task 6 Step 1 주석) · `toProfile` 수기 조립(Task 7) · 96px 스케일 밖·임의값 금지(Global + Task 6) · BASE_URL 트레일링 슬래시(Global + Task 10 Step 2 검증).
- **타입 일관성:** `ProduceProfile.image?: string` → `CardView.image?: string` → `ProduceCard({ card, eager })` → `CardKnobs.image: string('')` — 이름·옵셔널리티 일치 확인.
