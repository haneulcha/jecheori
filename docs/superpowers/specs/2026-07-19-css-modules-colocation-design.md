# CSS Modules 코로케이션 마이그레이션 — 설계

- 날짜: 2026-07-19
- 상태: 승인됨 (구현 대기)
- 관련: `DESIGN.md`(순수 CSS 변수 결정), 메모 `design-token-system.md`, `docs/superpowers/specs/2026-07-17-design-tokens-structural-design.md`

## 배경 · 동기

현재 스타일은 전역 단일 파일 `src/style.css`(584줄, `__root.tsx`에서 `?url`로 링크)에
모여 있다. 지금은 작지만 두 가지 성장통이 예상된다:

1. **전역 스코프** — 이름 충돌 가능, 죽은 CSS가 누적돼도 감지 안 됨, "이 클래스 누가
   쓰나"를 grep으로만 알 수 있음.
2. **스타일-컴포넌트 분리** — 색·간격 하나 바꾸려면 584줄에서 클래스를 찾아 이동해야 함.
   디자인 반복·아이디어 구현의 마찰.

이 둘의 원인은 **전역 스코프**이지 시맨틱 클래스명 자체가 아니다. 따라서 해법은
클래스명을 없애는 것(Tailwind)이 아니라 **컴포넌트별 지역 스코프 + 코로케이션**이다.
Tailwind 전면 전환은 이 앱 정체성의 60%를 차지하는 맞춤 효과(마스킹테이프·손글씨·간트·
계절 팔레트 = 의사요소·키프레임·속성 셀렉터)와 싸우고, 문서화된 "순수 CSS 변수" 결정을
뒤집는 대가를 요구한다. **CSS Modules는 Vite 내장이라 새 런타임·의존성이 0이고**, 토큰
시스템·시그니처 효과를 그대로 둔 채 파일만 지역화한다 — "경량·런타임 무외부요청" 규칙과
정합.

### 비목표 (YAGNI)

- Tailwind·CSS-in-JS·vanilla-extract 도입 안 함.
- 디자인 룩 변경 안 함. **시각 결과물은 픽셀 동일**해야 한다(순수 리팩터).
- `:root` 토큰 스케일·팔레트 재설계 안 함(별도 트랙).

## 사전 확인된 사실

- `src/style.css` 584줄, 단일 파일. `__root.tsx:3` `import appCss from '../style.css?url'`.
- 컴포넌트 17개(`src/components/*.tsx`), 시맨틱 클래스명.
- **디센던트 셀렉터는 거의 전부 한 컴포넌트 서브트리 안에서 닫힌다** — 각 컴포넌트가 자기
  클래스 뭉치를 온전히 소유한다(크로스-컴포넌트 결합 없음). 모듈 분리가 기계적·저위험.
- 동적 클래스: `fchip on`(FilterBar), `memo memo-closing`(RecipeMemo),
  `price ${dir}`(PriceBlock), `val/pt/lab now`(Sparkline), `season-label is-current`(SeasonStrip).
- `@keyframes` 2(memo-in/out), `@font-face` 4, `[data-season]` 4계절, `@view-transition` 1.
- 테스트가 클래스명으로 쿼리: 컴포넌트 테스트에 `querySelector('.x')` 76곳
  (className/getAttribute/closest 포함 116곳). 순수 로직 테스트(`tests/*.ts`, 1255줄)는 결합 0.

## 아키텍처

### 전역 ↔ 모듈 경계

**전역 유지 → `src/global.css`** (기존 `style.css`를 슬림화해 개명, `__root.tsx`에서 `?url` 링크 유지):

- `:root` 토큰 전체 (색·간격·폰트·라운드·타입 스케일)
- `@font-face` × 4 (`./fonts/*.woff2`)
- `[data-season='...']` 계절 팔레트 4종
- 리셋: `*` 스크롤바 숨김, `body`
- 요소 셀렉터: `header`(+ `header::before`, `header h1`), `footer`(+ `footer p`) — `__root.tsx`가 렌더
- `@view-transition`, `@media (prefers-reduced-motion)`의 view-transition 억제
- 공유 `@keyframes`가 있으면 전역 (단, memo-in/out은 RecipeMemo 전용 → 그 모듈로)

**모듈로 이전 → 컴포넌트별 `X.module.css` 코로케이션:**

| 모듈 파일 | 소유 클래스(대표) |
|---|---|
| `ProduceCard.module.css` | `.card`, `.summary-row`, `.id`, `.id-wrap`, `.emoji`, `.card-title`, `.kind`, `.why`, `.open`, `.pin` |
| `PriceBlock.module.css` | `.price`, `.fall`, `.rise`, `.compare`, `.cmp-label`, `.big`, `.wonu`, `.basis`, `.near`, `.chip`, `.arrow`, `.num` |
| `Sparkline.module.css` | `.spark`, `.trend`, `.pt`, `.val`, `.lab`, `.norm-line`, `.norm-lab`, `.now`, `.spark-foot` |
| `RecipeMemo.module.css` | `.memo`, `.memo-closing`, `.steps`, `.steps-fade`, `.ing`, `.count`, `.nav`, `.nav-prev`, `.nav-next`, `@keyframes memo-in/out` |
| `RecipeChips.module.css` | `.chips`, `.chip-btn`, `.recipe-section`, `.recipe-label`, `.memo-layer` |
| `NavIndex.module.css` | `.nav-index`, `.nav-cord`, `.nav-backdrop`, `.nav-panel`, `.nav-panel-clip`, `.nav-panel-inner` |
| `FilterBar.module.css` | `.filter`, `.fchip`, `.ctrlrow` |
| `SearchBar.module.css` | `.search`, `.controls` |
| `SortControl.module.css` | `.sort`, `.sort-icon` |
| `NutritionLine.module.css` | `.nutrition`, `.stats`, `.cell`, `.lab`, `.val`, `.serv`, `.u` |
| `SeasonStrip.module.css` | `.season-strip`, `.season-bar`, `.season-cell`, `.is-season`, `.is-peak`, `.season-labels`, `.season-label`, `.is-current` |
| `SeasonHint.module.css` | `.off-season`, `.off-divider`, `.hint-list`, `.season-hint`, `.hint-name`, `.hint-when`, `.hint-coming`, `.nodrop` |
| `Note.module.css` | `.note`, `.nrow`, `.lbl` |
| `PeakDot.module.css` | `.peak-dot`, `.peak-tip`, `.peak-badge` |
| `Sprig.module.css` | `.sprig`, `.week` |
| `Coming.module.css` | `.coming-month` |
| `App.module.css` | `.list`, `.picks`, `.empty`, `.loading`, `.surveyed`, `.rel-date`, `.date-tip` |

> 정확한 소유 경계는 구현 시 각 컴포넌트 JSX를 보고 확정한다(위 표는 셀렉터 위치 기준 초안).
> 두 컴포넌트가 한 클래스를 공유하면 → 부모 모듈에 두고 자식에 클래스명을 prop으로 넘기거나,
> 진짜 공유 원자면 전역 유틸로 승격. 발견 시 스펙 아닌 구현 판단.

### 동적 클래스 — `cx` 헬퍼

새 의존성 없이 `src/cx.ts`에 최소 헬퍼를 둔다:

```ts
// falsy 인자 무시, truthy만 공백 결합. clsx의 5% 기능 = 우리가 쓰는 전부.
export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ')
```

사용 예:

```tsx
// 전: className={`price ${dir}`}
className={cx(styles.price, styles[dir])}
// 전: className={`fchip${on ? ' on' : ''}`}
className={cx(styles.fchip, on && styles.on)}
// 전: className={closing ? 'memo memo-closing' : 'memo'}
className={cx(styles.memo, closing && styles.memoClosing)}
```

CSS Modules는 케밥케이스 클래스를 `styles['memo-closing']` 또는 카멜 자동변환
`styles.memoClosing`으로 노출. **케밥 대괄호 표기로 통일**(설정 최소화, 원본 클래스명 보존).

## 테스트 전략 (3분류)

| 티어 | 대상 | 처리 |
|---|---|---|
| **유지 + 디커플링** | ProduceCard, RecipeMemo, App, NavIndex, RecipeChips | 클래스 쿼리 → `getByRole`/`getByText`/`findByRole`/`data-testid`. **동작 커버리지 보존이 원칙** — 셀렉터만 바꾸고 검증 의도는 유지 |
| **삭제** | SeasonStrip, Sparkline, NutritionLine, Coming (순수 props→DOM) | 파생은 이미 `tests/card.test.ts`·`tests/season-strip.test.ts` 등이 검증 → 컴포넌트 테스트 중복. 제거 |
| **그대로** | `tests/*.ts` 순수 로직 1255줄 | 클래스 결합 0. 손대지 않음 |

- **PriceBlock 테스트**: 라벨 선택("평년/작년/비슷 대비")은 대부분 **텍스트** 검증이라 클래스
  결합이 아님 → 유지. 유일한 `.rise` 클래스 단언은 등락 방향을 의미 있는 신호(화살표·부호 텍스트)로
  교체. 파생이 `card.ts`에 있으면 해당 케이스는 삭제 후보(구현 시 판단).
- **디커플링 수단**: 가능하면 접근성 쿼리(role/text) 우선. 시각 전용 요소(스파크 점 등 role 없음)로
  꼭 타겟이 필요하면 `data-testid` 부여. `data-season` 등 **의미 있는 속성 단언은 유지**(스타일 아님).
- **스토리(`*.stories.tsx`) 3개**: `play` 함수의 `.norm-line` 등 클래스 쿼리도 같은 원칙으로 디커플링.

### "삭제" 티어의 감수하는 갭

파생(어느 달이 절정인가)은 순수 테스트가 보장하지만, *컴포넌트가 그 파생을 JSX로 옳게
매핑하는가*(`is-peak` 셀에 제대로 붙나)는 커버가 빈다. 매핑이 사소하다는 전제의 YAGNI 절충이며
승인됨. 회귀 시 브라우저 실측(아래 게이트)이 최후 방어선.

## 마이그레이션 순서 — 트레이서 불릿

한 컴포넌트를 **빌드·프리렌더·브라우저까지** 끝까지 뚫어 패턴과 최대 리스크를 먼저 증명한 뒤 팬아웃.

1. **스캐폴딩**: `src/cx.ts` 추가. `style.css` → `global.css` 개명하고 전역만 남긴 **복사본** 준비
   (아직 제거 안 함, 두 파일 병존으로 시각 회귀를 diff).
2. **트레이서 = PriceBlock**: `PriceBlock.module.css` 생성, JSX를 `styles`+`cx`로 전환.
   - **최대 리스크 검증**: `npm run build` 후 `dist/client/`에 모듈 CSS가 번들 CSS로 추출·링크되어
     프리렌더 정적 HTML에 반영되는가. **여기서 막히면 접근 재고**(게이트).
   - 브라우저 실측: 하락(`fall`)·상승(`rise`) 카드가 픽셀 동일한가.
3. **RecipeMemo**: `@keyframes memo-in/out`이 모듈 스코프에서 정상 동작하는가(드로어 열림/닫힘 모션).
4. **나머지 팬아웃**: 표의 모듈들을 컴포넌트별로 이전. 각 이전 후 해당 클래스가 `global.css`에서
   빠졌는지 확인(중복 정의 방지).
5. **마무리**: `global.css`에 컴포넌트 클래스가 남지 않았는지 최종 확인, 옛 `style.css` 잔재 제거.

## 검증 · 완료 게이트

`CLAUDE.md` 완료 게이트 준수:

- **`npm test`** — 디커플링된 테스트 통과, 삭제 티어 제거 반영.
- **`npx tsc --noEmit`** — CSS Modules 타입(`styles` 임포트). 필요 시 `vite-env.d.ts`에 `*.module.css`
  선언 확인/추가.
- **브라우저 실측(`npm run dev` + 프리렌더 빌드 서빙)**: 아래를 픽셀·동작 동일로 확인
  - 4계절 팔레트 스왑(`[data-season]`) — 마스킹테이프·간트 색
  - 카드 홀짝 기울기(`nth-child`), 마스킹테이프(`::before`), 잔가지
  - 레시피 메모 드로어 열림/닫힘 모션, 압정 닫기 + 포커스 복귀
  - 램프줄 인덱스 드로어(`grid-template-rows` 접힘)
  - 필터 칩 토글, 검색/정렬
  - `prefers-reduced-motion` 억제 정상
  - `@view-transition` MPA 전환(지원 브라우저)
- **하위경로 빌드**(`BASE_PATH=/jecheori/`) 자산 URL 회귀 없음 확인.

## 리스크 · 미해결

- **프리렌더 CSS 추출**(핵심): TanStack Start prerender에서 모듈 CSS가 정적 번들로 추출되는지 —
  트레이서 1~2단계에서 조기 검증. 미추출 시 대안 검토(전역 유지 + 부분 적용 등).
- **케밥 vs 카멜 클래스명**: 케밥 대괄호 표기로 통일해 원본 클래스명·설정 최소화.
- **테스트 삭제 후 매핑 갭**: 위 "감수하는 갭" 절 참조, 브라우저 실측이 방어선.

## 후속 (이번 범위 밖)

- 컴포넌트 테스트의 접근성 쿼리 전환을 계기로 role/aria 커버리지 점검(별도).
- `global.css`가 여전히 크면 토큰/리셋/폰트/시즌을 파일 분할(별도, 선택).
