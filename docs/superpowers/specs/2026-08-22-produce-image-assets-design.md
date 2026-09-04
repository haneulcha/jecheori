# 품목 이미지 에셋 — 설계 (2026-08-22)

카드의 품목 표식을 이모지에서 **실사 기반 벡터 도판**으로 교체한다.
AI로 70장을 생성하되, 70장이 한 세트로 보이게 하는 장치를 함께 정의한다.

관련: `DESIGN.md`(개정 3건 + 결정 기록, 아래 §9) · `docs/제품-동작-지도.md` ·
**시안 `docs/prototypes/2026-08-22-asset-concepts.html`** (브라우저로 열면 세 컨셉을
실제 카드 안에 나란히 놓고 비교할 수 있다. 그림은 손으로 짠 평탄화 시뮬레이션이지
AI 생성물이 아니다 — 컨셉 간 차이를 보여주는 용도)

---

## 1. 왜

지금 이모지는 **식별을 못 한다.** 🥬 하나가 애호박·배추·양배추·상추·얼갈이배추
다섯을 쓰고, 🐟 하나가 고등어·갈치·조기·삼치·꽁치·마른멸치 여섯을 쓴다. 김은
🍙(주먹밥)이다. 톤 문제가 아니라 기능 문제다 — 카드를 훑을 때 표식이 품목을
가리키지 못하고, 같은 그림이 반복돼 목록이 뭉개진다.

두 번째 이유: 이모지는 플랫폼 폰트라 우리가 통제할 수 없다. 앱의 나머지 전부가
자체 토큰·자체 폰트·자체 라인아트로 통제되는데 카드에서 가장 먼저 눈에 들어오는
요소만 남의 것이다.

## 2. 확정된 방향

시안(3안 비교, 브라우저 실측)에서 **시장 좌판 스틸라이프 · 접지 그림자 없음**으로
확정. 탈락안과 이유:

- **인쇄 도판**(색면 8–12, 종묘 카탈로그 어휘) — 앱의 보태니컬 어휘와 혈연이
  가장 강했으나, 실사 기반의 풍성함을 스스로 깎는다.
- **계절 표본 카드**(색면 5–8, 본체 단독) — 96px에서 무료 아이콘팩 톤이 난다.
  실사 기반을 고른 이유를 지운다.

접지 그림자는 좌판안의 기본값이었으나 **뺐다**. 두 근거:

1. **구조적으로 절반에 안 맞는다.** 접지 그림자는 "바닥에 놓인 것"에만 성립하는데
   70장 중 생선 측면도·낱잎(깻잎·상추)·한우 부위 단면·건어물은 놓여 있지 않다.
   품목마다 켜고 끄면 세트감이 깨지고, 전부 켜면 절반이 붕 뜬다. 브라우저 실측에서
   고등어 그림자가 몸통에서 떨어져 뜨는 것으로 확인했다.
2. **은유가 바뀐다.** 그림자가 켜지는 순간 그림이 *종이에 인쇄된 것*에서 *종이 위에
   놓인 물건*으로 바뀐다 — 냉장고 메모가 스크랩북에서 스티커북 쪽으로 이동한다.

좌상단 방향광만으로 입체가 서므로 그림자 없이도 납작해지지 않는다(실측 확인).

## 3. 시각 규격 — 앵커 확정 후 **동결**

| 축 | 값 |
|---|---|
| 기법 | 사진에서 유도한 벡터 트레이스 (Illustrator Image Trace / concept-to-vector 룩) |
| 색면 | 재질당 **20–40단계**. 반사·물기·잎맥이 살아남는 밀도 |
| 엣지 | 하드 엣지 색면만. **그라데이션 0 · 블러 0 · 외곽선 0 · 그레인 0** |
| 색 | **자연색 무보정.** 앱 팔레트로 틴트·감채도하지 않는다 |
| 조명 | 좌상단 따뜻한 자연광. **그림자 0** (캐스트·접지·반사 모두) |
| 시점 | 약간 위에서 3/4, 피사체 중앙. **긴 피사체는 대각선으로** — 80% 규칙이 긴 변을 맞추다 보니 납작하고 긴 것(고등어·갈치·오이·가지·대파)은 96px에서 시각 질량이 둥근 것의 1/3로 죽는다. 사각형의 대각선을 쓰면 1.41배를 회수한다 |
| 구성 | 본체 1–3개 + 부속물. **낱개가 작은 품목은 무리로** — 방울토마토·바지락·꼬막·홍합·멸치·계란·새우. 감귤은 낱과 3 + 깐 조각 1 |
| 배경 | **평면 마젠타 `#FF00FF`** (후처리에서 키잉). 투명 배경을 요구하면 Gemini 계열이 포토샵 체커보드를 픽셀로 그려서 준다 — 1회차 앵커 4장이 전부 그랬다 |

**부속물은 장식이 아니라 식별 장치다.** 시안에서 복숭아 잎을 빼니 그냥 동그란
과일이 되어 자두·천도복숭아와 구별되지 않았다. 축산은 식물 부속물이 없으므로
`PARTS` 슬롯이 **그 부위를 그 부위이게 하는 해부학적 특징**(갈비뼈 단면, 삼겹의
층, 양지의 결)을 대신 담는다.

## 4. 에셋 규격

| 항목 | 값 |
|---|---|
| 생성 원본 | 1024×1024 이상 PNG, 평면 마젠타 배경 |
| 배포 파일 | 288×288 WebP (표시 96px의 3x), 알파 |
| 점유율 | 피사체가 프레임의 **80%**, 사방 여백 균등 10% |
| 경로 | `public/assets/produce/{image}.webp` |
| 장수 | **70** (과일 12 · 채소 28 · 수산 16 · 축산 14) |
| 총 용량 | **~830KB** (1회차 앵커 4장 실측 평균 11.8KB × 70). 앞 2장은 `eager`, 나머지 `lazy` |

점유율 80%를 규격에 박는 이유: 70장의 피사체 크기가 제각각이면 카드를 스크롤할 때
그림이 커졌다 작아졌다 춤춘다. AI는 이걸 맞춰주지 않으므로 **후처리에서 강제**한다.

2x/3x `srcset`은 넣지 않는다 — 장당 ~15KB라 파일 수를 두 배로 늘릴 만큼의 절약이
아니다. 용량이 문제가 되면 그때 192px를 추가한다.

## 5. 프롬프트 시스템

### 5.1 포맷 — 8블록 고정, 4슬롯만 교체

```
Subject
{COMPOSITION} — {PARTS}. Korean market produce, {ITEM_KR}.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: {COLOUR_NOTE}. Do not stylise, tint or desaturate the
subject's own colour.

View
Three-quarter view from slightly above, subject centred, occupying about 80% of the
frame with even margins on all four sides. If the subject is markedly longer than it
is tall, angle it diagonally across the square so its long axis runs corner to
corner and it fills the frame.

Light
Warm natural daylight from the upper left, modelling the form. No cast shadow, no
contact shadow, no ground shadow — the subject is cleanly cut out with nothing
beneath it.

Background
A single flat solid magenta (#FF00FF) fill, edge to edge, with nothing on it — no
pattern, no checkerboard, no texture, no gradient, no vignette, and no shadow cast
onto it. The magenta is a chroma key that is removed afterwards, so keep the
subject's own colours free of pure magenta (natural purples such as grape skin are
fine — only the flat background colour is keyed).

Do not include
checkerboard, transparency checker pattern, alpha checker, fake transparency, text,
letters, numbers, labels, captions, watermark, signature, sparkle, star, glint,
decorative flourish, grid, collage, multiple panels, border, frame, vignette, drop
shadow, gradient, outline stroke, paper texture, props, hands, plates, bowls,
packaging, price tag, photorealism, 3D render, bokeh, depth of field.

Output
Square 1:1, at least 1024 × 1024, PNG.
```

**슬롯 4개 외의 문장은 한 글자도 바꾸지 않는다.** 바뀌지 않는 블록이 70장을 한
세트로 묶는 유일한 장치다. 슬롯을 4개로 나눈 이유: `COMPOSITION`은 개수와 배치를,
`PARTS`는 식별 문법을, `COLOUR_NOTE`는 색 드리프트를 각각 고정한다. 셋 중 하나만
비면 같은 프롬프트가 다른 그림을 낸다.

### 5.2 앵커 — 먼저 확정하고 동결

**앵커 4장:** `peach`(과일) · `mackerel`(수산) · `cabbage`(채소) ·
`hanwoo-sirloin`(축산). 형태 난이도와 도판 문법이 서로 다른 넷이다.

이 4장이 §6 검수 게이트를 통과할 때까지 프롬프트를 고친다. 통과하면 프롬프트를
동결하고, **이후 매 생성마다 앵커 4장을 레퍼런스 이미지로 첨부**한다:

> Match the flattening level, edge quality, lighting and framing of the attached
> reference plates exactly. Only the subject changes.

Nano Banana / Gemini 계열의 일관성은 문장이 아니라 첨부 이미지에서 나온다.

**생성기는 Gemini 계열로 간다.** 계획했던 GPT Image 비교는 **하지 않았다** — 구독이
없다. 비교 없이 고른 셈이므로, 66장 양산 중 Gemini가 구조적으로 못 내는 것(예: 특정
부위 단면)이 나오면 그때 다시 본다. Midjourney는 배경을 평면으로 못 잡아 제외한다.

### 5.3 슬롯 사전

부록 A. 70행 × 4슬롯. 항목이 이미지를 공유하는 경우는 부록 B.

## 6. 검수 게이트

뽑은 즉시 여섯을 본다. 하나라도 걸리면 재생성한다.

1. **배경이 평면 마젠타 한 색인가** — 체커보드를 그려주거나(1회차 실패 모드),
   배경에 그림자·질감·그라데이션이 얹히면 키잉이 깨끗이 안 된다. 후처리가 이걸
   잡아 실패시키므로(`배경이 제거되지 않았다`) 눈으로 먼저 거른다
2. **그림자가 섞였나** — 이 컨셉은 그림자 0
3. **점유율이 ~80%인가** — 후처리로 교정하되, 피사체가 잘려 나갔으면 재생성
4. **96px로 줄였을 때 무엇인지 읽히는가** — 1024px에서 아름다운 것과 96px에서
   읽히는 것은 다르다
5. **순백(`#FFFFFF`) 위에서 윤곽이 서는가** — 카드 배경이 순백이고 외곽선이 0이라,
   흰·은색 피사체는 배경에 녹는다. 위험군: `milk-white`(흰 카톤) ·
   `hairtail`(거울 같은 은색) · `dried-anchovy`(은백) · `chicken-broiler`(크림빛
   껍질) · `garlic`(아이보리) · `napa-cabbage`(흰 줄기). 녹으면 **자연색 범위 안에서
   음영을 깊게** 다시 뽑는다 — 외곽선을 넣거나 색을 보정하지 않는다(§3 동결)
6. **혼동군을 96px로 나란히 놓고 서로 구별되는가** — §4의 80% 점유율 정규화가
   실물의 절대 크기 단서를 지우기 때문에, 크기로 갈리던 쌍이 그림에선 안 갈린다.
   반드시 나란히 놓고 보는 군:

   | 혼동군 | 무엇으로 갈라야 하나 |
   |---|---|
   | 대파 · 쪽파 | 쪽파는 둥근 알뿌리가 분명해야. 대파는 흰 대가 굵고 곧게 |
   | 배추 · 얼갈이배추 | 배추는 단단히 여문 통, 얼갈이는 벌어진 단 |
   | 무 · 열무 | 무는 굵은 통 하나, 열무는 가는 뿌리 여럿 + 잎이 지배적 |
   | 부추 · 미나리 · 쪽파 | 부추는 납작한 잎날, 미나리는 속 빈 줄기 + 갈래잎, 쪽파는 알뿌리 |
   | 포도 · 샤인머스캣 | 색(흑자 vs 연두) + 분(bloom) 유무 |
   | 한우 등심 · 설도 · 양지 | 등심은 굵은 지방캡 + 촘촘한 마블링, 설도는 결 없는 민짜, 양지는 긴 결 |
   | 한우 갈비 · 수입 소갈비 | 정형이 다르다 — §12 참고. 뼈 단면의 두께·비율로 갈린다 |
   | 고등어 · 삼치 | 고등어는 등의 물결무늬, 삼치는 옆줄의 둥근 반점 |

## 7. 후처리 파이프라인 (고정)

```
1024 PNG
  → 알파 정리 (헤일로 제거)
  → 피사체 바운딩박스로 정사각 트림
  → 여백 10% 재부여          ← 점유율 80% 통일이 여기서 강제된다
  → 288×288 WebP (알파)
  → public/assets/produce/{image}.webp
```

수집 스크립트가 아니라 **1회성 로컬 작업**이다. 에셋은 영양·레시피와 같은
**씨앗형** — 거의 안 변하므로 상시 CI를 두지 않는다 (`CLAUDE.md` 규칙과 동일한 결).

**원본 1024 PNG는 커밋하지 않는다** (70장이면 수십 MB). 저장소에 들어가는 건 288
WebP뿐이고, 진실의 원천은 **동결 프롬프트**(`docs/superpowers/notes/`에 기록)와 커밋된
WebP다. 대가: 후처리 파라미터를 바꿔 다시 뽑고 싶어지면 원본이 없어 재생성해야 한다 —
씨앗형이라 이 대가를 받아들인다. 원본은 로컬에 두되 버전관리 밖에 둔다.

**캐시:** 파일명에 해시를 넣지 않는다(사람이 읽는 이름이 `produce.json`과 대응해야
한다). 대신 **그림을 다시 뽑으면 파일명을 바꾸고 `produce.json`의 `image`를 같이
고친다**(`peach` → `peach-2`). 정적 호스트가 옛 그림을 계속 주는 사고를 파일명으로
막는다. 씨앗형이라 이런 일이 잦지 않다.

**용량 실측:** §13 1단계(앵커 4장)에서 실제 WebP 크기를 재서 §4의 추정치를 실측치로
갱신한다. 비늘·마블링 같은 고밀도 피사체는 25–35KB로 튈 수 있어, 추정만 믿고
넘어가지 않는다.

## 8. 코드 변경

### 8.1 데이터

`produce.json`의 각 항목에 **`image` 필드**(파일 basename)를 추가한다. `emoji`는
지우지 않고 폴백으로 남긴다.

basename이라 **여러 항목이 한 장을 공유**할 수 있고, 이게 "축산은 부위별 1장,
등급은 공유" 결정과 정확히 맞는다:

```
hanwoo-sirloin-1pp / -1p / -1      → image: "hanwoo-sirloin"
imported-beef-rib-us / -au         → image: "imported-beef-rib"
pork-belly / imported-pork-belly   → image: "pork-belly"
egg-10 / egg-30                    → image: "egg"
```

등급을 그림으로 가르지 않는 이유: 등급은 이미 품목명에 적혀 있고, 96px에서 1++와
1등급의 마블링 차이를 그림으로 구분하려는 건 과잉이다.

### 8.2 타입·파생·표시

- `src/types.ts` — `ProduceProfile.image?: string`
- `src/card.ts` — `CardView.image?: string` (`emoji`는 유지, 둘 다 넘긴다)

  ⚠️ **`CardView` 조립처는 둘이다** — `toCardView`(card.ts:183~)와
  `toComingCardView`(card.ts:223~). `image?`가 옵셔널이라 **한 곳을 빠뜨려도
  `tsc`가 안 잡고**, 폴백이 있어 화면도 안 깨진다 — `/coming` 카드만 조용히
  이모지로 남는다. 두 곳 모두에 `image: profile.image`를 넣고, `tests/card.test.ts`에
  두 함수 각각의 케이스를 건다.

- `src/app.ts` — 변경 없음. 세 빌더(`buildAppView`·`buildComingView`·
  `buildLivestockView`)가 위 두 조립처를 타므로 자동으로 덮인다. `SeasonHint`는
  이모지 유지(§8.3). **축산 14장은 `/livestock`에서만 보인다** — 실측할 때 이 경로를
  빼먹지 않는다.
- `src/components/ProduceCard.tsx` — `image`가 있으면 96px `<img>`, 없으면 기존
  이모지 `<span>`

```tsx
{card.image
  ? <img src={`${import.meta.env.BASE_URL}assets/produce/${card.image}.webp`}
         width={96} height={96} alt=""
         loading={eager ? 'eager' : 'lazy'}
         fetchPriority={eager ? 'high' : undefined} />
  : <span className={styles.emoji} aria-hidden="true">{card.emoji}</span>}
```

- **`alt=""`** — 품목명이 바로 옆(`<summary>` 안)에 있다. alt를 채우면 스크린리더가
  이름을 두 번 읽는다. 장식이 아니라 **중복**이라서 비운다.
- **이모지 폴백에도 `aria-hidden="true"`** — 같은 논리다. 지금은 이게 없어서
  스크린리더가 "복숭아 복숭아"로 읽는다(기존 결함). 신규와 폴백의 SR 출력을 맞춘다.
- **`eager` prop** — 첫 화면 카드의 이미지까지 lazy면 96px 빈 칸이 보였다가 채워진다.
  `ProduceCard`가 `eager?: boolean`을 받고, 목록 렌더 쪽에서 **앞 2장에만** `true`를
  넘긴다. 나머지는 lazy.
- **`width`/`height`가 크기의 유일한 권위다.** 96px는 `global.css`의 spacing
  스케일(최대 `--spacing-3xl` = 3rem) 밖이라 유틸리티로 표현할 수 없고,
  `w-[96px]` 같은 임의값은 CLAUDE.md가 금지한다. 속성으로 정하면 CLS 방지도 겸한다.
  정렬·수축 방지 등 CSS가 더 필요해지면 **스케일 밖 기하(경계 기준 3)**이므로
  `ProduceCard.module.css`로 간다 — 유틸리티에 임의값을 쓰지 않는다.
- 경로에 `import.meta.env.BASE_URL`을 쓴다 — Vite가 트레일링 슬래시로 정규화하므로
  `${BASE_URL}assets/…`는 루트·`/jecheori/` 양쪽에서 맞고, `src/data.ts:8`의 기존
  관례와 같은 패턴이다.

### 8.3 `SeasonHint`는 이모지 유지

검색 결과·비제철 힌트 줄은 **본문 크기 텍스트 줄**이다. 실사 벡터를 24px로 넣으면
읽히지 않는다. 카드는 그림의 자리고 목록 줄은 글자의 자리라, 다른 게 맞다.

### 8.4 테스트 · Storybook

- `src/components/ProduceCard.test.tsx` — `image` 있을 때 `<img>` 렌더 / 없을 때
  이모지 폴백, 두 케이스

  ⚠️ **`getByRole('img')`를 쓰지 않는다.** `alt=""`인 `<img>`는 접근성 트리에서
  빠져 그 쿼리로 안 잡히고, 게다가 `role="img"`는 이미 `SeasonStrip`
  (`SeasonStrip.tsx:14`)이 점유하고 있어 기존 제철 띠 테스트와 충돌한다.
  `container.querySelector('img')`로 간다.

- `tests/card.test.ts` — `toCardView`·`toComingCardView` 각각 `image` 전달 케이스
- **에셋 존재 검사 테스트** — `produce.json`의 모든 `image` 값에 대해
  `public/assets/produce/{image}.webp`가 실제로 있는지 검사한다. 오타 하나가 96px
  깨진 이미지로 나가는 걸 막는다. 역방향(참조 없는 고아 파일)도 함께 본다.
  **선례:** `tests/font-coverage.test.ts` — 조용한 폴백 대신 시끄러운 실패
  (DESIGN.md 콘텐츠 서브셋 절과 같은 결).
- **Storybook** — `src/story-utils.tsx`의 `toProfile`이 `ProduceProfile`을 수기
  조립하므로 `image`를 안 옮기면 뷰 상태 탐색기에서 영영 안 보인다(옵셔널이라
  에러도 없다). `image`를 넘기고, 이미지/이모지 폴백 스토리 1쌍을 추가한다.
  `staticDirs` 설정은 불필요 — `.storybook/main.ts`가 tanstack 플러그인만
  걷어내고 Vite의 `publicDir`은 그대로 살아 있다(`storybook-static/data/`가 증거).
- 게이트는 `npm test` **와** `npx tsc --noEmit` 둘 다
- **브라우저 실측 필수** — `/`·`/coming`·`/livestock` 세 경로 모두에서 96px 실제
  렌더, lazy 로드 중 레이아웃 안 튀는지, 순백 카드 위 알파 경계에 헤일로 없는지

## 9. DESIGN.md 개정 3건 + 결정 기록

1. **"카드 안엔 장식 일러스트를 두지 않는다"에 예외를 연다.** 식별 도판은 장식이
   아니다 — 정보 그래픽(볼드 가격·등락 칩·스파크라인·제철 띠)을 카드에 허용한 것과
   같은 논리다. 머리말 스케치 1점 규칙(시그니처)은 그대로다.

2. **색 규율에 단서를 단다.** "텍스트·링크·버튼은 오직 쪽빛이 소유한다"는 그대로
   유지된다. 이미지는 배경 도형(블롭·마스킹테이프·칩 배경)처럼 자연색을 가질 수
   있다 — 다만 **이미지 위에 글자를 얹지 않는다.** 그라데이션 금지도 유지되며,
   에셋이 하드 엣지 색면이라 실질적으로 지켜진다.

3. **시그니처 문장을 고친다.** 컨셉 절의 "**시그니처 (과감함은 여기에만):** 쪽빛
   라인아트 스케치가 놓인 머리말 … 나머지는 조용히"는 그대로 두면 **거짓이 된다** —
   19장의 카드마다 자연색 도판 96px가 들어오면 화면에서 가장 시끄러운 건 더 이상
   머리말이 아니다. 개정 1·2 어느 쪽에도 안 걸리는 문장이라 따로 손본다.
   방향: *"과감한 **장식**은 여전히 머리말 하나. 카드의 도판은 장식이 아니라 식별
   장치이고, 그래서 조용할 의무 대신 읽힐 의무를 진다."*

**결정 기록 1건 추가.** 이 저장소의 DESIGN.md는 모든 방향 전환을 결정 기록에 남기는
관례가 있다(마루부리 제거, 차양 전환 등). 이번 전환도 한 항목으로 남긴다 — 이모지의
식별 실패, 시안 3안 비교와 탈락 이유, 접지 그림자 탈락의 구조적 근거, 96px 결정.

## 10. 카드 표지 레이아웃 — **확정 (게이트 2 통과, 2026-08-24)**

시안: `docs/prototypes/2026-08-22-card-cover-layout.html` (뷰포트·엣지 케이스 토글 + 실시간 높이 실측)

### 초안의 전제가 틀렸다

이 스펙 초안은 표지를 "3열(그림 · 이름/띠 · 가격)"로 예상했다. 브라우저 실측 결과
**산술적으로 불가능하다**:

- 카드 안쪽 폭은 390px 폰에서 **324.4px**이다. 384px은 데스크톱(448px 뷰포트) 값이었다.
- 가격 열은 **120.3px 아래로 안 줄어든다.** 기준선이 `whitespace-nowrap`이고
  `min-width:auto`라 shrink를 전부 왼쪽 열이 먹는다 (최장: 전복 `5마리 기준 · 개당 2,014원`).
- 324.4 − 16 − 120.3 = 188.1. 여기서 마크 96 + 갭을 빼면 이름에 **82.5px**만 남는다.
  320px 기기에선 **12.7px**. 성립하지 않는다.

그래서 세 시안은 전부 **"가격을 어디로 보내느냐"**로 갈렸다.

### 확정: 안 B-2

```
┌──────────────────────────────────────┐
│            ▔▔▔▔ 마스킹테이프            │
│  ┌────────┐  복숭아 ●                 │   ← 행 1: 마크 96 + 이름·품종
│  │  도판   │  햇사레                   │
│  │  96px  │                          │
│  └────────┘                          │
│  지난 주 대비 ↓13%      3,120원        │   ← 행 2: 가격 전폭, 가로로
│                       100g 기준       │
│  ▁▁▁▓▓▓▁▁▁▁▁▁  6 7 8 9              │   ← 행 3: 제철 띠 전폭
│  7월 복숭아가 제일 답니다               │   ← 행 4: 손글씨 전폭
└──────────────────────────────────────┘
```

- **행 2가 이 안의 핵심이다.** 가격이 전폭 행을 갖되 그 행을 실제로 가로로 쓴다 —
  등락 칩 왼쪽, 큰 숫자와 기준선 오른쪽. 세로로 쌓으면 82px, 가로로 펴면 43px이다.
- **제철 띠는 전폭 고정** — 기존 `width: 60%`(`.idWrap` 종속) 버그 수정. §10.1 참고.
- 마크는 **96px 유지.** A(96)와 C(72) 비교에서 카드별 높이가 **동일**했다 —
  높이를 지배하는 건 마크가 아니라 오른쪽 열이라, 도판 품질을 깎을 이유가 없다.

**실측 (4장 합계):**

| | 390px | 320px |
|---|---|---|
| 현행 (27px 이모지) | 601 | — |
| 안 A 세로 스택 | 871 | 797 |
| 안 B 가격 독립행 | 1147 | 1014 |
| **안 B-2 (확정)** | **1047** | **966** |
| 안 C (72px 마크) | 847 | 773 |

A가 가장 낮지만 "가격이 자기 행을 갖는" B 계열을 택했고, B-2가 B에서 100px을 회수한다.

### 구현 시 지킬 것

- **가격 행에 `flex-wrap`을 둔다.** 전복(칩 113.7 + 기준선 120.3 = 243.6)이 320px
  카드 폭 254.6px에 **11px 여유**로 들어간다. `prices.json`엔 이미 123.0px짜리
  기준선(`10마리 기준 · 개당 8,273원`)이 있고 단위도 9종으로 늘고 있어 여유가 더
  줄어든다 — 안 들어가면 깨지는 대신 칩이 윗줄로 물러나게 한다.
- **가격 없는 카드**(옥수수·부추·단호박·가지 4품목 + `/coming` 전량)는 가격 행이
  통째로 사라진다. 이름 블록을 마크 옆 **세로 중앙**으로 붙여 오른쪽 아래 공백을 없앤다.
- **`.cardTitle`에 `word-break: keep-all`.** 없어서 320px에서 축산 28장 중 20장이
  어절 중간에서 쪼개진다("한우 안/심"). 96px 이전부터 있던 버그다.

### 검토했으나 안 간 길 — B-3 (띠를 마크 옆으로)

구현 후 브라우저 실측에서 B-2의 오른쪽 위가 비는 게 보였다. 제철 띠를 그 자리로
올리면 행 하나가 줄고 공백이 사라진다 — 엣지 4장 320px 기준 966 → **853px**,
카드당 28px. 효과는 확실했다.

**그런데 대가가 §10.1에서 방금 고친 버그다.** 띠 폭이 324.4 → 218.8px(320px
기기에선 149px)로 줄어 칸당 12.4px이 되는데, 두 자리 월 라벨의 잉크 폭이 11.6px이라
여유가 **0.8px**뿐이다. 갈치·물오징어가 `7 8 91011`로 붙어 읽히던 문턱이 정확히
거기다. 390px에선 18.2px/칸(여유 6.6px)으로 편안하지만 320px에서 벼랑 끝에 선다.

**공백은 미관이고 띠 판독은 기능이다.** 실측으로 "지금 배포된 화면에서 실제로
겹친다"를 확인하고 고친 참에 미관 때문에 그 문턱으로 되돌아가지 않는다. 시안에는
`b3` 옵션으로 남겨 뒀다 — 66장이 채워져 96px 도판이 실제로 자리를 채운 뒤 다시 볼
값이 있다. 지금 공백이 커 보이는 건 84품목 중 78개가 아직 폴백 이모지여서이기도 하다.

## 10.1 함께 고치는 기존 버그 둘

레이아웃을 다시 짜는 김에 같이 고친다. 시안 세 안 모두에 이미 반영돼 있다 —
선택지가 아니라 수정이다.

1. **제철 띠 축척이 카드마다 다르다.** `SeasonStrip.module.css`의 `width: 60%`가
   `.idWrap` 기준인데 `.idWrap`은 `flex: 1`이라 가격 열 폭에 따라 **112.8~194.5px
   (1.72배)**로 흔들린다. 간트는 행끼리 비교하라고 있는 물건인데 축 길이가 다르면
   비교가 성립하지 않는다. **전폭 고정**으로 바꾼다.
2. **두 자리 월 라벨이 겹친다.** 위 축척 문제의 직접적 결과 — 갈치·물오징어에서
   390px 1.7px, 320px 5.2px 겹쳐 `7 8 91011`로 붙어 읽힌다. 전폭이 되면 칸 폭이
   두 자리 라벨의 잉크 폭(11.6px)을 넘어 사라진다.

## 11. 이번 범위 밖

- **목록 줄·검색 결과의 표식** — `SeasonHint`는 이모지 유지(§8.3)
- **다크모드** — 앱에 없다
- **등급·정형의 시각적 구분** — §12

## 12. 표면화한 결정 (부재로 나타나는 것들)

`CLAUDE.md` "데이터·정책 결정" 규칙에 따라, **안 하는 것**을 적어 둔다:

- **등급을 그림으로 안 가른다** — 한우 15항목이 5장을 공유한다. 화면엔 "등급이
  달라도 그림이 같다"로 나타난다. 등급은 이미 품목명에 적혀 있고, 96px에서 1++와
  1등급의 마블링 차이를 그림으로 구분하려는 건 과잉이다.
- **공유 기준은 원산지가 아니라 정형이다.** 겉모습이 같으면 공유하고 다르면 나눈다:
  - 돼지 삼겹살 / 수입 삼겹살 → **공유**. 정형이 같다.
  - 한우 갈비 / 수입 소갈비 → **공유** (2026-09-03 실측으로 확정, 70 → 69장).
    초안은 "수입은 LA갈비식 두꺼운 단면이라 정형이 다르다"고 보아 분리했으나,
    96px에서 갈리지 않았다. 240px에서는 차이(길고 얇은 대 vs 짧고 각진 덩이)가
    보이지만 카드 크기에서는 둘 다 "층진 갈비 덩어리"다. 원칙("겉모습이 같으면
    공유")을 뒤집은 게 아니라, 겉모습이 같다는 사실을 실측으로 확인한 것이다.
    화면에서는 문구가 구분을 진다 — "한우 갈비보다 저렴한 구이·찜감이에요.
    미국산입니다."
- **품종을 그림으로 안 가른다** — `kind`(햇사레 등)는 텍스트로만 구별된다.
  포도/샤인머스캣, 참외/멜론처럼 겉모습이 다른 것만 별개 장이다.
- **점진 도입** — 70장이 다 될 때까지 에셋 없는 품목은 이모지로 보인다. 한 화면에
  도판과 이모지가 섞여 보이는 기간이 있다.
- **다크모드 없음** — 앱에 없으므로 에셋도 단일 버전.

이 결정들은 `docs/제품-동작-지도.md`에도 옮긴다 (`CLAUDE.md` 데이터·정책 결정 규칙 —
"무엇이 언제 왜 보이나"를 한 곳에 모으는 문서).

## 13. 순서

**게이트가 둘이다.** 각 게이트 전엔 뒤 단계를 시작하지 않는다.

1. 앵커 4장 생성 → 검수 게이트 6항목 → 프롬프트 동결 → 용량 실측 기록
   → **⛔ 게이트 1: 사인오프**
2. 생성기 확정 — Gemini 계열 (GPT Image 비교는 미수행, §5.2)
3. **앵커 4장을 실제 카드에 얹어** 표지 레이아웃 시안 2~3안 (§10)
   → **⛔ 게이트 2: 사인오프**
4. 코드 — 타입 · `card.ts` 두 조립처 · `ProduceCard`(레이아웃 + `eager` prop) ·
   `story-utils` · 테스트 4종(컴포넌트 2 · `card.ts` 2 · 에셋 존재 1 · 스토리 1쌍)
5. 나머지 66장 양산 + 검수 (게이트 6항목, 혼동군은 나란히 놓고)
6. 후처리 파이프라인 1회 실행 → `public/assets/produce/`
7. `produce.json` `image` 필드 채우기 (부록 A·B)
8. `DESIGN.md` 개정 3건 + 결정 기록 · `docs/제품-동작-지도.md`에 §12 반영 ·
   `global.css:138`의 `--text-xl` 주석 갱신(카드 이모지 → 폴백 전용)
9. 브라우저 실측 — `/` · `/coming` · `/livestock` 세 경로 → 스크린샷 사인오프

4번을 5번보다 앞에 두는 이유: 코드가 먼저 서 있어야 66장을 뽑는 족족 실제 화면에
얹어 검수할 수 있다. 66장을 다 뽑고 나서 코드를 붙이면, 잘못 뽑은 걸 66장분 뒤에
발견한다.

---

## 부록 A — 슬롯 사전 (70행)

각 행을 §5.1 포맷의 `{COMPOSITION}` `{PARTS}` `{COLOUR_NOTE}` `{ITEM_KR}`에 넣는다.

### 과일 (12)

| image | ITEM_KR | COMPOSITION | PARTS | COLOUR_NOTE |
|---|---|---|---|---|
| `peach` | 복숭아 | two whole peaches, one upright and one tilted beside it | with two attached leaves and a short cut stem | cream-yellow to apricot skin with a deep carmine blush on the sunward cheek; leaves muted olive-green |
| `watermelon` | 수박 | one whole watermelon with a thick wedge cut and leaning against it | with the wedge showing flesh, seeds and rind in cross-section | deep green rind with dark serpentine stripes; crimson flesh, pale green-white rind band, glossy black seeds |
| `korean-melon` | 참외 | two whole Korean melons, one standing and one lying | with shallow white longitudinal furrows and a small dry stem scar | vivid canary-yellow skin with ten white furrows; matte, not glossy |
| `apple` | 사과 | two whole apples, one upright and one tilted | with a short woody stem and one attached leaf | deep red skin streaked with yellow-green striations and pale lenticel flecks |
| `pear` | 배 | two whole Korean pears, round rather than tapered | with a short stem and a wide sunken calyx | russet golden-brown skin densely freckled with pale lenticels |
| `grape` | 포도 | one broad-shouldered bunch of Campbell Early grapes with three loose berries beside it | with a short woody stem and one vine leaf tucked behind, the individual round berries clearly separated rather than merging into one mass | near-black purple berries under a dusty pale bloom; leaves deep green |
| `shine-muscat` | 샤인머스캣 | one broad-shouldered bunch of Shine Muscat grapes with three loose berries beside it | with a short woody stem and one vine leaf tucked behind, the individual oval berries clearly separated rather than merging into one mass | translucent yellow-green berries, glossy, no bloom |
| `mandarin` | 감귤 | three whole mandarins and one peeled segment | with two attached leaves on the top fruit | bright orange dimpled skin; the segment a lighter translucent orange |
| `sweet-persimmon` | 단감 | two whole sweet persimmons, flat-round rather than pointed | with the four-lobed calyx on top | orange-vermilion skin, smooth and slightly waxy; calyx dry sage-brown |
| `kiwi` | 참다래 | two whole kiwifruit and one cut half | with the cut half showing the pale radial core and black seed ring | matte fuzzy russet-brown skin; interior vivid lime-green with a white core |
| `strawberry` | 딸기 | three whole strawberries, one tilted forward | with green calyx and short stem on each | glossy scarlet with pale yellow seeds set in dimples; calyx bright green |
| `melon` | 멜론 | one whole netted melon with a wedge cut and leaning against it | with raised cream netting across the rind and the wedge showing the seed cavity | sage-green rind under cream netting; pale green-orange flesh |

### 채소 (28)

| image | ITEM_KR | COMPOSITION | PARTS | COLOUR_NOTE |
|---|---|---|---|---|
| `tomato` | 토마토 | two whole tomatoes, one upright and one tilted | with the green star calyx and short stem | deep scarlet, glossy; calyx bright green |
| `cucumber` | 오이 | two whole Korean cucumbers laid at a slight angle | with the small dry blossom end and fine surface ridges | deep green with paler longitudinal ridges and small pale spines |
| `zucchini` | 애호박 | two whole aehobak, the short plump Korean zucchini | with a short cut stem | pale jade green, matte and smooth, no stripes |
| `potato` | 감자 | three whole potatoes clustered together | with shallow eyes and a little dry soil in the creases | pale buff-brown skin with faint earthy patches; matte |
| `corn` | 옥수수 | two ears of corn, one husked and one half-husked | with the pulled-back green husk and pale silk | pale yellow-white kernels in even rows; husk fresh green, silk cream |
| `spinach` | 시금치 | one bunch of spinach with roots attached | with crinkled leaves and the root crown | deep green crinkled leaves; root crown magenta-pink |
| `napa-cabbage` | 배추 | one whole napa cabbage, upright | with loose outer leaves opening at the base | thick white ribs grading to pale yellow-green crinkled leaf tips |
| `cabbage` | 양배추 | one whole green cabbage | with two loose outer wrapper leaves attached at the base | pale jade interior grading to bluish sage on the wrapper leaves; cream veins |
| `lettuce` | 상추 | one loose head of Korean red leaf lettuce | with ruffled leaf edges | green leaves washed with burgundy at the ruffled edges |
| `eolgari-cabbage` | 얼갈이배추 | one bundle of eolgari, young open-leaf napa cabbage | with long white ribs and open green leaf tops | slender white ribs, bright green loose leaves |
| `garlic-chives` | 부추 | one flat bundle of garlic chives | with the pale cut ends aligned | flat deep green blades, pale white-green at the cut ends |
| `perilla-leaf` | 깻잎 | a small stack of perilla leaves, the top leaf fully visible | with serrated edges, prominent veins and short stems | deep green with a purple cast on the underside; matte |
| `sweet-pumpkin` | 단호박 | one whole kabocha with a wedge cut beside it | with a short woody stem and the wedge showing flesh and seeds | dark green rind with pale grey-green mottling; flesh deep marigold |
| `cherry-tomato` | 방울토마토 | five cherry tomatoes clustered, two still on the vine | with the green vine truss and star calyxes | glossy deep red; vine bright green |
| `eggplant` | 가지 | two whole Korean eggplants, long and slender | with the calyx and short stem | glossy deep violet-black; calyx green flushed purple |
| `green-chili` | 풋고추 | three whole green chilies, slightly crooked | with green stems attached | bright grass-green with a light sheen |
| `paprika` | 파프리카 | two bell peppers, one red and one yellow, side by side | with green stems and shoulders | one deep scarlet and one canary yellow, both high-gloss; stems green |
| `radish` | 무 | one whole Korean radish laid at a slight angle | with the cut green leaf crown | white body shading to pale green at the crown; leaves deep green |
| `young-radish` | 열무 | one bundle of young summer radishes with tops | with slender roots and long leaves | slim white-pink roots; leaves bright fresh green |
| `carrot` | 당근 | three whole carrots laid side by side | with the trimmed green stem tufts | saturated orange with fine pale rings; stem tufts green |
| `broccoli` | 브로콜리 | one whole broccoli crown with the stalk | with the thick cut stalk and two small leaves | deep blue-green tight florets; stalk pale green with a cream cut face |
| `green-onion` | 대파 | one bundle of three large green onions | with white shanks, root hairs and long green tops | white shanks grading to deep green tops; roots pale cream |
| `scallion` | 쪽파 | one bundle of small scallions | with rounded white bulbs and root hairs | white-pink bulbs, slender bright green tops |
| `onion` | 양파 | three whole onions clustered, one with its papery skin peeling | with the dry neck and papery outer skin | golden-bronze papery skin with fine vertical lines; the peeled edge pale ivory |
| `garlic` | 마늘 | one whole garlic head with two separated cloves beside it | with the papery wrapper and dry stem stub | ivory-white papery skin with faint violet veining; cloves pale cream |
| `ginger` | 생강 | one whole knobbly ginger rhizome | with branching knuckles and one cut face | pale tan skin, matte and slightly fibrous; cut face pale yellow |
| `sweet-potato` | 고구마 | three whole sweet potatoes clustered | with tapered ends and shallow root scars | deep red-purple skin, matte |
| `minari` | 미나리 | one bundle of water dropwort | with hollow pale stems and small serrated leaflets | pale green hollow stems, deeper green leaflets |

### 수산 (16)

| image | ITEM_KR | COMPOSITION | PARTS | COLOUR_NOTE |
|---|---|---|---|---|
| `mackerel` | 고등어 | one whole chub mackerel in full lateral profile | with dorsal, pectoral and tail fins intact | steel blue-green back with dark oblique wave-bands, sharply divided from a silver-white belly |
| `hairtail` | 갈치 | one whole hairtail, its long ribbon body in a loose S curve | with the long dorsal fin ribbon and pointed head | uniform bright metallic silver, almost mirror-like; dark eye |
| `croaker` | 조기 | one whole yellow croaker in lateral profile | with fins and tail intact | pale golden-yellow belly and fins, grey-brown back, silvery flank |
| `spanish-mackerel` | 삼치 | one whole Spanish mackerel in lateral profile | with a long slender body, forked tail and fins intact | blue-grey back with scattered dark round spots along the flank; silver belly |
| `saury` | 꽁치 | two whole saury laid side by side, heads opposed | with slender pointed jaws and forked tails | dark blue-black back with a sharp silver band along the flank; lower jaw tipped yellow |
| `squid` | 물오징어 | one whole common squid, mantle upright, arms fanned below | with two triangular fins, eight arms and two long tentacles | translucent cream mantle mottled with red-brown chromatophores; arms paler |
| `abalone` | 전복 | two whole abalone, one shell-side up and one foot-side up | with the row of respiratory pores along the shell rim | shell dark green-brown outside, iridescent blue-green nacre inside; foot pale beige |
| `shrimp` | 새우 | three whole raw shrimp, curled | with long antennae, legs and tail fans | translucent grey-pink shell with faint darker banding; tail fan tipped red-orange |
| `blue-crab` | 꽃게 | one whole blue crab seen from above | with both claws raised, all legs and the spined carapace edge | mottled blue-grey and olive carapace; claw tips deep orange-red; underside cream |
| `mussel` | 홍합 | a small cluster of five mussels | with closed shells, the hinge and a few byssal threads | glossy blue-black shells with brown-purple growth rings |
| `clam` | 바지락 | a small heap of seven Manila clams | with closed ridged shells | cream, grey and brown shells with dark zigzag and ray patterning |
| `octopus` | 낙지 | one whole small octopus, head up, arms trailing | with eight long slender arms and visible suckers | pale grey-beige mottled with red-brown; suckers cream |
| `cockle` | 꼬막 | a small heap of six cockles | with deeply ribbed fan-shaped shells | chalky grey-white to tan shells with strong radiating ribs |
| `laver` | 김 | a stack of three sheets of dried laver, the top sheet slightly offset | with the slightly rough uneven edges of each sheet | near-black with a deep green-purple sheen; matte with a faint gloss on the pressed side |
| `dried-seaweed` | 마른미역 | a small loose bundle of dried wakame fronds | with ruffled frond edges and visible midribs | very dark brown-green, nearly black, dry and matte |
| `dried-anchovy` | 마른멸치 | a small heap of dried anchovies, several fully visible | with intact heads, eyes and tails | silvery-white bodies with a dark blue-grey dorsal line; dry matte finish |

### 축산 (14)

축산은 식물 부속물이 없다. `PARTS`가 **그 부위를 그 부위이게 하는 해부학적 특징**을
대신 담는다 — 이게 없으면 96px에서 모든 붉은 고기가 같아 보인다.

| image | ITEM_KR | COMPOSITION | PARTS | COLOUR_NOTE |
|---|---|---|---|---|
| `hanwoo-tenderloin` | 한우 안심 | one thick round tenderloin steak on its own | a clean trimmed cylinder with no bone | deep cherry-red lean with very fine white marbling and a thin cream fat edge |
| `hanwoo-sirloin` | 한우 등심 | one thick sirloin steak on its own | the broad eye of the loin with its outer fat cap | deep cherry-red lean with dense fine white marbling; cream-white fat cap |
| `hanwoo-round` | 한우 설도 | one lean round block, tall and squared rather than a thin slice | a pale silverskin seam running across one face, very little fat | deep red lean, sparse marbling; silverskin pale pearl-grey |
| `hanwoo-brisket` | 한우 양지 | one brisket block with the grain running lengthwise | coarse long muscle fibre and a fat layer along one edge | dark red lean with pronounced long grain; cream fat layer |
| `hanwoo-rib` | 한우 갈비 | one section of bone-in beef short ribs lying flat, the ribs running lengthwise | the long rib bones showing along the side, no sawn cross-section facing the viewer | deep red meat layered with cream fat; bone pale ivory |
| `imported-beef-rib` | 수입 소갈비 | one section of bone-in beef short ribs lying flat, cut thicker and squarer than the Korean trim | the long rib bones showing along the side, no sawn cross-section facing the viewer | bright red meat with thicker cream fat layers; bone pale ivory |
| `imported-beef-ribmeat` | 수입 소갈비살 | one whole boneless rib-meat piece, rounded and full rather than sliced | no bone, and no cut face toward the viewer; the muscle seams reading as gentle ridges across the outer surface | bright red lean with cream fat seams |
| `pork-front-leg` | 돼지 앞다리살 | one whole block of pork shoulder, full and rounded | an unbroken outer surface with a thin fat cap, no cut face toward the viewer | pale rose-pink lean with a cream fat cap |
| `pork-belly` | 돼지 삼겹살 | three slices of pork belly, fanned | the alternating lean and fat layers seen edge-on | rose-pink lean striped with cream-white fat in clear bands |
| `pork-rib` | 돼지 갈비 | one rack section of pork ribs | the rib bones running through the meat | pale rose meat with cream fat; bones ivory |
| `pork-neck` | 돼지 목살 | two thick pork neck steaks, overlapping | coarse marbled seams threading through the cut | rose-pink with coarse cream marbling |
| `chicken-broiler` | 닭 | one whole dressed chicken, breast up, legs tucked | wings folded, skin intact | pale cream-yellow skin with faint pink beneath; matte |
| `egg` | 계란 | five whole eggs clustered, one set slightly apart | intact shells, no carton or tray | warm light brown shells with faint speckling and a matte chalky surface |
| `milk-white` | 흰우유 | one 1-litre gable-top milk carton, three-quarter view | the gable fold and side seam, entirely unprinted | plain white carton with pale blue-grey shading on the shadowed face |

> `milk-white` 주의: 부정 프롬프트가 텍스트를 금지하므로 카톤에 인쇄가 없다. 무지
> 카톤이 어색하면 컵에 따른 우유로 바꾸는 것도 가능하나, 그러면 "장바구니에 담는
> 것"이 아니라 "마시는 것"이 되어 다른 70장과 결이 어긋난다. 무지 카톤으로 간다.

## 부록 B — 항목 → 이미지 매핑 (공유되는 것만)

| 항목 id | image |
|---|---|
| `hanwoo-tenderloin-1pp` / `-1p` / `-1` | `hanwoo-tenderloin` |
| `hanwoo-sirloin-1pp` / `-1p` / `-1` | `hanwoo-sirloin` |
| `hanwoo-round-1pp` / `-1p` / `-1` | `hanwoo-round` |
| `hanwoo-brisket-1pp` / `-1p` / `-1` | `hanwoo-brisket` |
| `hanwoo-rib-1pp` / `-1p` / `-1` | `hanwoo-rib` |
| `imported-beef-rib-us` / `-au` | `imported-beef-rib` |
| `imported-beef-ribmeat-us` / `-au` | `imported-beef-ribmeat` |
| `pork-belly` / `imported-pork-belly` | `pork-belly` |
| `egg-10` / `egg-30` | `egg` |

나머지 항목은 `image`가 자기 `id`와 같다.
