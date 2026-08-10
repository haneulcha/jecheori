# Tailwind 마이그레이션 기준선 (Phase 0)

전환 전(2026-08-11, `feat/tailwind-migration` 브랜치 분기 직후) 상태를 찍어둔 기록.
이후 태스크는 여기 적힌 수치·체크리스트·스크린샷 파일명과 대조한다. 이 문서를 쓰는 동안
소스·CSS·설정은 건드리지 않았다(읽기 전용 확인 + 문서 작성만).

## 1. CSS 총량

```
$ wc -l src/global.css src/components/*.module.css | tail -1
     698 total
```

기대치(698줄) 그대로 일치. 파일별 내역:

| 파일 | 줄 수 |
|---|---:|
| `src/global.css` | 154 |
| `App.module.css` | 67 |
| `ButtonGroup.module.css` | 54 |
| `Coming.module.css` | 3 |
| `FilterBar.module.css` | 32 |
| `Livestock.module.css` | 7 |
| `NavIndex.module.css` | 39 |
| `Note.module.css` | 5 |
| `NutritionLine.module.css` | 23 |
| `PeakDot.module.css` | 9 |
| `PriceBlock.module.css` | 15 |
| `ProduceCard.module.css` | 99 |
| `RecipeChips.module.css` | 16 |
| `RecipeMemo.module.css` | 60 |
| `SearchBar.module.css` | 12 |
| `SeasonHint.module.css` | 4 |
| `SeasonStrip.module.css` | 32 |
| `SortControl.module.css` | 10 |
| `Sparkline.module.css` | 29 |
| `Sprig.module.css` | 28 |
| **합계** | **698** |

## 2. 빌드 CSS 번들 크기

`npm run build` (정적 프리렌더 포함) 후 `dist/client/assets/*.css`:

| 파일 | 원본 | gzip |
|---|---:|---:|
| `coming-CAwoD-v3.css` | 151 B | 146 B |
| `global-C_xYPTWV.css` | 3,121 B | 1,285 B |
| `livestock-Cp5Icis3.css` | 94 B | 127 B (헤더 오버헤드로 원본보다 큼) |
| `ProduceCard-D7KT0zxi.css` | 13,020 B | 3,420 B |
| `routes-CsA_7LkI.css` | 4,307 B | 1,351 B |
| **합계** | **20,693 B (~20.2 KiB)** | **6,329 B (~6.2 KiB)** |

파일 5개 — 기대 범위(4~5개) 안. 해시는 빌드마다 바뀌므로 이후 태스크는 파일명이 아니라
개수·역할(전역/라우트별/컴포넌트별 청크)과 바이트 크기로 비교한다.

## 3. 화면·계절 스크린샷 체크리스트

뷰포트 420×900(모바일), 오늘 날짜 기준 계절은 여름(8월, `data-season` 기본값 `summer`).
`document.body.dataset.season`은 `--accent`/`--tint`만 바꾸고 품목 목록 자체는 안 바뀐다.
"어느 화면을 계절별로 다시 찍어야 하나"는 페이지 단위로 짐작하지 않고, 소비처를 기계적으로
전수 조사해서 정했다:

```
$ grep -rn -- "--accent\|--tint" src/global.css src/components/*.module.css
```

토큰 정의(`global.css`의 `:root`/`[data-season=...]`) 말고 실제로 값을 **쓰는** 규칙은 9곳이다:

| 소비처 | 접힌 카드에서 보이나 | 커버하는 스크린샷 |
|---|---|---|
| `global.css` 헤더 블롭(`header::before`) | 해당 없음(카드와 무관, 헤더 자체) | 홈 계절별 |
| `ButtonGroup.module.css` `.thumb`(세그먼트 썸) | 해당 없음(홈 전용 컨트롤) | 홈 계절별 |
| `FilterBar.module.css` `.fchip.on`(켜진 카테고리 칩) | 해당 없음(홈 전용 컨트롤) | 홈 계절별 |
| `ProduceCard.module.css` `.card::before`(마스킹테이프) | **보임** — `[open]`에 안 걸려 있음 | 홈 계절별 + 카드 펼침 계절별 |
| `ProduceCard.module.css` `.card[open]` 테두리 | 안 보임 — 펼쳐야만 | 카드 펼침 계절별만 |
| `PeakDot.module.css` `.peakDot b`(절정 도트+헤일로) | **보임** — `<summary>` 안 | 홈 계절별 + 카드 펼침 계절별 |
| `SeasonStrip.module.css` `.isSeason`/`.isPeak` | **보임** — `<summary>` 안 | 홈 계절별 + 카드 펼침 계절별 |
| `PriceBlock.module.css` `.price.fall .chip` | **보임** — `<summary>` 안 | 홈 계절별 + 카드 펼침 계절별 |
| `RecipeChips.module.css` 선택 칩 배경 | 안 보임 — 펼치고 칩을 눌러야만 | 카드 펼침 계절별만 |

즉 `SeasonStrip`·`PeakDot`·`PriceBlock`·마스킹테이프는 `ProduceCard`의 `<summary>` 안에 있어
**카드가 접혀 있어도** 보인다 — 홈 목록의 접힌 카드에 이미 다 나타난다. 카드가 **펼쳐져야만**
보이는 소비처는 딱 둘(열림 테두리, 선택된 레시피 칩)이고 그건 카드 펼침 스크린샷이 커버한다.
그래서 홈 계절별(4장) + 카드 펼침 계절별(4장)로 위 9곳 전부가 최소 한 장 이상에 나타난다.

`/coming`·`/livestock`은 **이 9곳 중 하나도 안 쓰기 때문이 아니라**, 둘 다 홈과 완전히 같은
`ProduceCard`(따라서 같은 마스킹테이프·`PeakDot`·`SeasonStrip`·`PriceBlock`)를 그대로 렌더링해서
— 즉 이미 홈·카드 펼침 계절별 스크린샷이 커버한 것과 동일한 컴포넌트라서 — 별도 계절 스크린샷이
필요 없다. 두 화면은 여름 한 번만 찍고 각 화면 고유의 것(`/coming`의 `<h2>` 볼드, `/livestock`의
등락 배지)만 확인한다.

검색 힌트 화면은 **이 캡처 상태(`딸기` 검색, 제철 아님이라 결과 0건)에서는** `ProduceCard`가
아예 렌더링되지 않아 위 9곳 중 카드 소비처(6곳)가 화면에 없다 — 화면 자체의 성질이 아니라
지금 캡처한 상태의 성질이다. 다만 페이지 크롬(헤더 블롭·`ButtonGroup`·`FilterBar`)은 검색 중에도
그대로 남아 있고 그건 홈 계절별 스크린샷이 이미 커버하므로, 이 상태에서는 별도 계절 스크린샷이
필요 없다.

정리하면 grep으로 찾은 9개 소비처 전부가 계절별 스크린샷(홈 4장 + 카드 펼침 4장) 중 최소
하나에 나타난다. 압축 결과: **홈은 4계절**, **카드 펼침은 4계절**, **`/coming`·`/livestock`·
검색 힌트는 여름 한 번**(4계절×5화면 20장 대신 11장). 모든 파일은 `.playwright-mcp/`에
있고(gitignore 대상, 커밋 안 함) 이후 태스크가 같은 이름으로 재촬영해 diff한다.

- [x] 홈 `/` (여름·기본, 전체 목록) — `baseline-home-summer.png`
  - 헤더 계절 블롭, 검색/카테고리/필터바, 멜론~가지 9장 카드 리스트, 하단 출처 3줄까지 정상.
- [x] 카드 펼침 (멜론 클릭, 뷰포트 1장 + 펼친 전체 목록 1장) — `baseline-card-expanded-summer.png`,
      `baseline-card-expanded-summer-full.png`
  - 펼치면 스파크라인·영양·"제철이의 한마디"(손글씨)·레시피 칩(`멜론스프`)까지 보임.
    카드 테두리가 accent색(노랑)으로 바뀜.
- [x] 카드 펼침 — 봄 accent/tint (멜론 펼치고 레시피 칩 `멜론스프` 선택한 채로
      `data-season='spring'`) — `baseline-card-expanded-spring.png`
  - 연두로 확인되는 소비처: 카드 상단 마스킹테이프·열림 테두리(`ProduceCard`), 이름 옆
    절정 도트+헤일로(`PeakDot`), 제철 띠의 절정 셀 채움(`SeasonStrip`), 가격 하락 칩
    배경(`PriceBlock`), 선택된 레시피 칩 배경(`RecipeChips`) — 한 화면에 5곳 모두 보임.
- [x] 카드 펼침 — 가을 accent/tint (`'autumn'`) — `baseline-card-expanded-autumn.png`
  - 위와 동일한 5곳이 주황으로 바뀜.
- [x] 카드 펼침 — 겨울 accent/tint (`'winter'`) — `baseline-card-expanded-winter.png`
  - 위와 동일한 5곳이 로즈로 바뀜.
- [x] `/coming` (여름 기준 리스트, 9월·10월 섹션) — `baseline-coming-summer.png`
  - 월별 섹션 `<h2>`("9월", "10월")이 진하게(볼드) 보임 — §4 참고.
- [x] `/livestock` — `baseline-livestock-summer.png`
  - 축산물 카드 19장, 등락 배지(상승 빨강/하락 파랑) 정상.
- [x] 검색 힌트 (검색창에 `딸기` 입력) — `baseline-search-hint-strawberry.png`
  - "지금은 제철이 아니에요" + 🍓 딸기 12~4월 힌트 카드 노출.
- [x] 홈 — 봄 accent/tint (`document.body.dataset.season = 'spring'`) — `baseline-home-spring.png`
  - 헤더 블롭·카드 테이프·인디케이터가 연두(`#a2d3a6`/`#eaf4e9`)로 바뀜.
- [x] 홈 — 가을 accent/tint (`'autumn'`) — `baseline-home-autumn.png`
  - 주황(`#ed7328`/`#fbe7d6`)으로 바뀜.
- [x] 홈 — 겨울 accent/tint (`'winter'`) — `baseline-home-winter.png`
  - 로즈(`#bc6e79`/`#f6e7ea`)로 바뀜.

부가로 확인한 것(모션 확인 겸용, §4에서 다시 씀):

- [x] NavIndex 램프줄 드로어 열림 — `baseline-navindex-open.png`
- [x] 레시피 메모 열림(멜론스프) — `baseline-recipe-memo-open.png`

콘솔 에러 0건(React DevTools 안내 메시지만 정상 출력).

## 4. 모션·디테일 3종 — Preflight 회귀 감시 대상

### 4-1. 카드 펼침 리빌 (높이 + 투명도)

`ProduceCard.module.css`의 `::details-content` 규칙(`interpolate-size: allow-keywords` +
무JS 아코디언, Chrome 131+ 전제):

```css
.card::details-content {
  height: 0; opacity: 0; overflow: clip;
  transition: height 240ms cubic-bezier(0.4,0,0.2,1),
              opacity 240ms cubic-bezier(0.4,0,0.2,1),
              content-visibility 240ms allow-discrete;
}
.card[open]::details-content { height: auto; opacity: 1; }
```

멜론 카드를 클릭해 펼쳤을 때 스파크라인·영양·노트·레시피 칩까지 자연스럽게 자라며(높이) 옅게
드러났고(투명도), 열리는 순간 카드 테두리가 `--accent`(노랑)로 바뀌었다. 정상. 이 규칙은
`@media (prefers-reduced-motion: no-preference)` 안에 있어 reduced-motion에서는 즉시 펼침으로
폴백한다(이번엔 reduced-motion은 별도로 안 켜고 기본 상태만 확인).

### 4-2. NavIndex 램프줄 차양 드로어 (`0fr↔1fr`)

`NavIndex.module.css`: `.navPanel { display: grid; grid-template-rows: 0fr; transition:
grid-template-rows 300ms cubic-bezier(0.2,0.75,0.2,1); }` → `[data-open] .navPanel {
grid-template-rows: 1fr; }`, 안쪽 `.navPanelClip { overflow: hidden; }`(패딩 없음, CLAUDE.md가
지적한 "패딩 때문에 0으로 안 접히는" 회귀와 무관하게 지금은 완전히 접힘 확인).

램프줄(🔘 아이콘) 클릭 → 차양이 천장에서 펼쳐지며 "지금 제철인 품목 / 다가오는 제철 품목 /
축산물 값" 3개 링크가 드러남. 백드롭(투명, 클릭 시 닫힘)도 정상. `baseline-navindex-open.png`.

### 4-3. 레시피 메모 in/out + `<ol>` 단계 번호

`RecipeMemo.module.css`: 열림 `memo-in 0.2s ease-out`(opacity 0→1 + translateY -8px→0 +
scale 0.98→1), 닫힘 `memo-out 0.18s ease-in forwards`(대칭) 후 `CLOSE_MS=180ms` 타이머로
DOM 제거.

- 칩(`멜론스프`) 클릭 → 메모가 카드 위에 핀처럼 꽂히며 부드럽게 나타남. 정상.
- **`<ol>` 단계 번호(1. 2. 3. …)가 화면에 또렷이 보임** — `RecipeMemo.module.css`에
  `list-style` 관련 규칙이 없어 브라우저 기본 `decimal` 마커를 그대로 쓴다.
  `baseline-recipe-memo-open.png`에서 1~5번 단계 번호 확인. **이게 Preflight 회귀 감시
  대상이다**: Tailwind Preflight는 `ol`에 `list-style: none`을 기본 적용하므로, 마이그레이션
  후 이 프로젝트가 Preflight를 쓴다면 번호가 사라진다. `.memo .steps`에 명시적으로
  `list-style: decimal`(또는 동등한 유틸리티)을 다시 넣어야 한다.
- 압정(레시피 떼기) 클릭 → 메모가 옅어지며 사라짐(스냅샷상 DOM에서 제거됨 확인). 정상.

### 4-4. 헤딩 볼드 — 별도 Preflight 회귀 후보

브리프가 특히 짚은 두 헤딩을 소스에서 확인:

- `/coming`의 월 섹션 `<h2>`("9월", "10월") — `Coming.module.css`의 `.comingMonth h2` 규칙은
  `font-size`/`letter-spacing`/`margin-bottom`만 정하고 **`font-weight`를 지정하지 않는다**.
  지금은 브라우저 기본 UA 스타일시트(h1~h6 기본 bold)로 진하게 보인다.
  `baseline-coming-summer.png`에서 "9월"이 볼드로 렌더됨을 확인.
- `RecipeMemo`의 `<h3>`(레시피 이름, 예: "멜론스프") — `RecipeMemo.module.css`의 `.memo h3`도
  `font-size`/`margin`/`color`/`text-align`만 정하고 **`font-weight` 미지정**. 마찬가지로 UA
  기본 bold로 렌더. `baseline-recipe-memo-open.png`에서 확인.

**둘 다 Tailwind Preflight가 켜지면 위험하다** — Preflight는 `h1`~`h6`에
`font-size: inherit; font-weight: inherit;`를 강제해 부모(기본 `font-weight: 400`)를
상속하게 만들므로, 이 두 헤딩은 명시적으로 `font-weight`를 되살리지 않으면 볼드가
사라진다(마진도 Preflight가 0으로 밀기 때문에 `.comingMonth h2`의 `margin-bottom`,
`.memo h3`의 `margin`도 Preflight 적용 후 실제 값이 그대로 유지되는지 함께 확인해야 함 —
이 두 컴포넌트는 각자 마진을 명시하고 있어 위험은 낮지만, 다른 무명시 헤딩이 있다면 같이
살펴본다).

## 5. 결론 — 이후 태스크가 지켜야 할 것

1. CSS 총량 698줄, 번들 5개(~20.2 KiB raw / ~6.2 KiB gzip)를 마이그레이션 후 수치와 비교한다
   (완전히 같을 필요는 없지만 급격한 증가는 이상 신호).
2. 화면 5종 + 계절 accent/tint 4종은 위 스크린샷 파일명으로 재촬영해 육안 대조한다.
3. 모션 3종(카드 리빌/차양 드로어/메모 in-out)은 타이밍·이징이 바뀌지 않았는지 브라우저로
   직접 열고 닫아 확인한다.
4. **`<ol>` 단계 번호**와 **`/coming`의 `<h2>`·`RecipeMemo`의 `<h3>` 볼드**는 Tailwind
   Preflight를 켜는 순간 가장 먼저 깨질 수 있는 지점이므로, Preflight 도입 태스크에서
   반드시 개별 확인한다.

## 6. 마이그레이션 후 실측 (Phase 5, 2026-08-11) — 전/후 대조

### 6-1. CSS 총량

```
$ wc -l src/global.css src/components/*.module.css | tail -1
     666 total
```

| 파일 | 전 (Phase 0) | 후 (Phase 5) |
|---|---:|---:|
| `src/global.css` | 154 | 212 |
| `App.module.css` | 67 | 67 |
| `ButtonGroup.module.css` | 54 | 54 |
| `Coming.module.css` | 3 | 삭제됨(유틸리티로 이관) |
| `FilterBar.module.css` | 32 | 32 (죽은 스크롤바 2줄 삭제, 주석 갱신 — 총량 우연히 동일) |
| `Livestock.module.css` | 7 | 삭제됨(유틸리티로 이관) |
| `NavIndex.module.css` | 39 | 39 |
| `Note.module.css` | 5 | 5 |
| `NutritionLine.module.css` | 23 | 삭제됨(유틸리티로 이관) |
| `PeakDot.module.css` | 9 | 9 |
| `PriceBlock.module.css` | 15 | 삭제됨(유틸리티로 이관) |
| `ProduceCard.module.css` | 99 | 99 |
| `RecipeChips.module.css` | 16 | 삭제됨(유틸리티로 이관) |
| `RecipeMemo.module.css` | 60 | 60 |
| `SearchBar.module.css` | 12 | 삭제됨(유틸리티로 이관) |
| `SeasonHint.module.css` | 4 | 삭제됨(유틸리티로 이관) |
| `SeasonStrip.module.css` | 32 | 32 |
| `SortControl.module.css` | 10 | 삭제됨(유틸리티로 이관) |
| `Sparkline.module.css` | 29 | 29 |
| `Sprig.module.css` | 28 | 28 |
| **합계** | **698** | **666** |

**정직한 평가: 손으로 쓰는 CSS 줄 수는 거의 안 줄었다(698 → 666, −32줄 = −4.6%).**
모듈 8개(~90줄)가 유틸리티로 녹아 사라졌지만, `global.css`가 `:root` → `@theme static` 이전
(자간·굵기·`margin:0` 신규 토큰 + 결정 근거 주석 포함)으로 154→212줄(+58줄)로 불어나 거의
상쇄했다. 남은 11개 모듈(454줄)은 애초에 **이번 사이클의 범위가 아니었다** — 시그니처 효과
(의사요소·`@keyframes`·스케일 밖 기하)라 유틸리티로 옮길 수 없는 것들이다. 이번 사이클이
실제로 산 것은 줄 수 절감이 아니라 **토큰 체계를 `@theme static`으로 옮긴 것**과, **새 UI를
파일 왕복 없이 유틸리티로 바로 쓸 수 있는 능력**이다(스펙 "작성 속도" 근거 참고).

### 6-2. 빌드 CSS 번들 크기

`npm run build` 후 `dist/client/assets/*.css`:

| 파일 | 원본 | gzip |
|---|---:|---:|
| `global-C9-WL06H.css` | 10,948 B | 3,051 B |
| `ProduceCard-_O6A_uct.css` | 10,828 B | 2,945 B |
| `routes-Cci3l-e0.css` | 3,321 B | 1,129 B |
| **합계** | **25,097 B (~24.5 KiB)** | **7,125 B (~7.0 KiB)** |

| | 전 (Phase 0) | 후 (Phase 5) |
|---|---:|---:|
| 파일 개수 | 5개 (`coming`·`global`·`livestock`·`ProduceCard`·`routes`) | 3개 (`global`·`ProduceCard`·`routes`) |
| 원본 합계 | 20,693 B (~20.2 KiB) | 25,097 B (~24.5 KiB) |
| gzip 합계 | 6,329 B (~6.2 KiB) | 7,125 B (~7.0 KiB) |

파일 개수는 줄었다(`coming`·`livestock` 라우트 전용 청크가 사라지고 그 스타일이 `routes`/
`global` 청크의 유틸리티로 흡수됨) — 청크 경계가 컴포넌트별에서 Tailwind가 훑는 소스 단위로
바뀐 결과다. 반면 바이트 합계는 늘었다(원본 +21%, gzip +13%) — Tailwind 유틸리티 CSS(클래스당
개별 규칙)가 손으로 압축해 쓴 CSS Modules 선언보다 태생적으로 더 장황하기 때문이다. 절대
크기(raw 24.5 KiB, gzip 7.0 KiB)는 여전히 이 앱 규모에서 무시할 만한 수준이라 급격한 증가로
보지 않는다(§5-1의 "급격한 증가는 이상 신호" 기준 대비 정상 범위).

### 6-3. 화면·모션·grep 게이트

Task 5 Step 9(브라우저 회귀 실측)와 Step 2(grep 게이트) 결과는
`.superpowers/sdd/2026-08-11-tailwind-migration/task-5-report.md`에 기록한다.
