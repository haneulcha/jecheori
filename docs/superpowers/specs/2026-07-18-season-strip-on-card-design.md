# 제철 월 띠 (Season Strip) — 카드 설계

> 2026-07-18 · 펼친 품목 카드에 "이 품목이 몇 월에 제철인가"를 12칸 달력 띠로 보인다.
> 시안 3안(A 모노 잉크 / B 절기색 / C 눈금 바+라벨) 비교 후 **A · 모노 잉크** 확정.

## 왜

카드는 지금 가격·등락·"왜 지금"·영양·레시피를 말하지만, 정작 **"언제가 제철인가"**를
숫자로 보여주지 않는다. `PeakDot`이 "지금이 절정"을 점 하나로 말할 뿐, 한 해 중 어느
구간인지·이번 달이 그 안 어디쯤인지는 알 수 없다. 이 앱은 "장보기 옆에 두는 계절 달력"
(북극성: 창이지 거울 아님)이므로, 품목의 **연간 제철 아크**를 달력 띠로 얹는 것은
정체성과 정합한다.

데이터·파생은 이미 다 있다 — `ProduceProfile.seasonMonths`/`peakMonths`, 그리고
`season.ts`의 `seasonLabel()`(랩어라운드 병합 포함). 지금은 검색의 비제철 힌트에만 쓰인다.
빠진 건 **카드 표시 계층**뿐이다.

## 확정 시안 — A · 모노 잉크

12칸(1~12월) 가로 띠 + 그 아래 월 숫자줄.

- **제철 달(inSeason)**: `--tint`로 채움 (현재 계절색의 옅은 톤).
- **절정 달(isPeak)**: `--accent`로 채움 (같은 계절 웜색의 진한 톤). `peakMonths ⊆ seasonMonths`.
- **비제철 달**: 채움 없음, `--line` 하이라인만.
- **이번 달(isCurrent)**: 잉크(`--ink`) 테두리(inset box-shadow)로 표시. 채움 상태와 **직교** —
  이번 달이 제철이면 채움 위에 잉크 테두리가 겹친다.
- **월 숫자줄**: 1~12, `--axis` 색·`tabular-nums`. 이번 달 숫자는 잉크·볼드, 제철 달 숫자는
  `--muted`.
- **캡션**: 띠 위 한 줄 `제철 달력 · 이번 달 N월` (`--muted`, micro 라벨). N은 현재 달.

### 색 규율 준수

DESIGN.md의 **"웜 컬러는 배경만, 글자는 항상 쪽빛"**·**"그라데이션 금지"**를 지킨다.
채움은 배경(`--tint`/`--accent`)이고, 유일하게 잉크가 실리는 곳은 테두리·숫자다.
띠는 카드가 상속한 **현재 계절색**(`body[data-season]` → 카드 → 띠)을 그대로 쓴다 —
새 계절 판정 로직 없음. 메인 페이지는 제철 품목만 뜨므로 "이번 달 색 = 그 품목이 제철인 색"이
자연히 성립한다.

## 아키텍처 — 경계대로

순수 파생은 `card.ts`, 표시는 `components/`. (CLAUDE.md 아키텍처 경계)

### 1. `card.ts` — `SeasonStripView` + `toSeasonStrip`

```ts
export interface SeasonMonthCell {
  month: number        // 1~12
  inSeason: boolean
  isPeak: boolean
  isCurrent: boolean
}

export interface SeasonStripView {
  months: SeasonMonthCell[]   // 길이 12, month 1→12 순
  seasonLabel: string         // "6~8월" (aria·향후 표시용) — season.ts seasonLabel() 재사용
  peakLabel: string           // "7월"
  currentMonth: number        // 캡션·aria용
}

export function toSeasonStrip(profile: ProduceProfile, month: number): SeasonStripView
```

- `season.ts`의 `seasonLabel()`을 import해 `seasonLabel`/`peakLabel` 생성 (중복 구현 금지).
- 순수·부작용 없음. `month`는 이미 `toCardView`가 받는 값을 그대로 넘긴다.

### 2. `card.ts` — `CardView`에 필드 추가 + `toCardView` 연결

```ts
export interface CardView {
  // ...기존...
  season: SeasonStripView
}
```

`toCardView(pick, month, ...)` 안에서 `season: toSeasonStrip(profile, month)` 채운다.
`season`은 항상 존재한다(모든 프로필에 `seasonMonths`가 있으므로) — nullable 아님.

### 3. `components/SeasonStrip.tsx` — 표시만

`{ strip: SeasonStripView }`를 받아 캡션 + 12칸 + 숫자줄을 렌더. 비즈니스 로직 없음.
접근성: 띠 컨테이너에 `aria-label="제철 {seasonLabel}, 절정 {peakLabel}, 이번 달 {N}월"`.
개별 칸은 장식(`aria-hidden`) — 스크린리더는 문장 하나만 읽는다.

### 4. `components/ProduceCard.tsx` — 배치

`.open` 안, **스파크라인 다음·`NutritionLine` 앞**에 `<SeasonStrip strip={card.season} />`.
(가격 신호(스파크라인) → 계절 맥락(띠·영양) 순.)

### 5. `src/style.css` — `.season-strip*` 클래스

시안 A의 CSS를 프로젝트 토큰으로 이식. 새 색 토큰 없이 기존 `--tint`/`--accent`/`--ink`/
`--line`/`--axis`/`--muted`만 사용.

## 스코프 — 무엇을 안 하나 (표면화)

- **`/coming`의 `ComingCard`엔 넣지 않는다** (이번 사이클). 정적·가격 없는 예고 카드라
  펼침 상세가 없고, 마스킹테이프 계절색이 이미 "미래 달 계절"을 말한다. 향후 별도 판단.
- **검색 비제철 힌트(`SeasonHint`)는 그대로** — 이미 `seasonLabel` 텍스트를 보여준다.
- **띠는 정적이다** — 월 탭/호버로 월별 `whyNow`를 여는 인터랙션은 넣지 않는다(YAGNI).
  카드 표지 하단 `whyNow` 한 줄이 "이번 달의 이유"를 이미 말한다.
- **이번 달이 제철 밖인 렌더**: 메인 페이지 펼친 카드엔 발생하지 않는다(제철 품목만 노출).
  그래도 `toSeasonStrip`은 임의 `month`에 대해 옳게 동작한다(테스트로 고정) — 이번 달 칸이
  띠 밖(비제철)이면 채움 없는 칸에 잉크 테두리만.

## 테스트

- **순수(`tests/card.test.ts` 또는 신규 `tests/season-strip.test.ts`)** — `toSeasonStrip`:
  - 여름 연속 구간(수박 `[6,7,8]` peak `[7]`), month=7 → 7월 `isCurrent && isPeak`.
  - 랩어라운드(딸기 `[12,1,2,3,4]` peak `[1,2,3]`) → `seasonLabel === '12~4월'`, 12·1·2·3·4가
    `inSeason`, 5~11 비제철.
  - 이번 달이 제철 밖(수박, month=1) → 1월 `isCurrent && !inSeason`.
  - `months.length === 12`, 순서 1→12.
- **컴포넌트(`src/components/SeasonStrip.test.tsx`, `// @vitest-environment jsdom`)**:
  - 제철/절정/이번달 칸에 각 클래스가 붙는지.
  - `aria-label`에 seasonLabel·peakLabel·현재 월이 담기는지.
- **Storybook**: `SeasonStrip` 또는 `ProduceCard` 스토리에 노브(제철·절정·현재월)로 상태 탐색.
- **게이트**: `npm test` **와** `npx tsc --noEmit` 둘 다. 픽스처는 유효 타입값.
- **브라우저 실측**: `npm run dev`로 실제 카드 펼쳐 띠 렌더·색·이번달 마커·랩어라운드 확인
  (단위테스트는 렌더된 색·레이어를 못 본다).

## 문서 갱신

확정 후 `DESIGN.md` 결정 기록에 한 줄(제철 띠 A안 채택·색 규율), 필요시
`docs/제품-동작-지도.md`에 "카드가 무엇을 보이나"에 제철 띠 추가.
