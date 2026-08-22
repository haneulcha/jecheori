# 품목 이미지 에셋 — 설계 (2026-08-22)

카드의 품목 표식을 이모지에서 **실사 기반 벡터 도판**으로 교체한다.
AI로 70장을 생성하되, 70장이 한 세트로 보이게 하는 장치를 함께 정의한다.

관련: `DESIGN.md`(개정 2건, 아래 §9) · `docs/제품-동작-지도.md` ·
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
| 시점 | 약간 위에서 3/4. 피사체 중앙, 정립 |
| 구성 | 본체 1–3개 + 부속물. 낱개가 작은 품목(방울토마토·바지락·멸치)은 무리로 |
| 배경 | 완전 투명 |

**부속물은 장식이 아니라 식별 장치다.** 시안에서 복숭아 잎을 빼니 그냥 동그란
과일이 되어 자두·천도복숭아와 구별되지 않았다. 축산은 식물 부속물이 없으므로
`PARTS` 슬롯이 **그 부위를 그 부위이게 하는 해부학적 특징**(갈비뼈 단면, 삼겹의
층, 양지의 결)을 대신 담는다.

## 4. 에셋 규격

| 항목 | 값 |
|---|---|
| 생성 원본 | 1024×1024 투명 PNG |
| 배포 파일 | 288×288 WebP (표시 96px의 3x), 알파 |
| 점유율 | 피사체가 프레임의 **80%**, 사방 여백 균등 10% |
| 경로 | `public/assets/produce/{image}.webp` |
| 장수 | **70** (과일 12 · 채소 28 · 수산 16 · 축산 14) |
| 총 용량 | 약 1.0–1.4MB. 카드별 `loading="lazy"`, 첫 화면은 ~10장 |

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
reflections, moisture and leaf veining survive. Hard-edged colour fields only (no
gradients), but stepped finely enough to read as photographic. No outline stroke,
no grain.

Colour
True-to-life natural colour: {COLOUR_NOTE}. Do not stylise, tint or desaturate the
subject's own colour.

View
Three-quarter view from slightly above, subject centred and upright, occupying about
80% of the frame with even margins on all four sides.

Light
Warm natural daylight from the upper left, modelling the form. No cast shadow, no
contact shadow, no ground shadow — the subject is cleanly cut out with nothing
beneath it.

Background
Fully transparent. Nothing behind or around the subject.

Do not include
text, letters, numbers, labels, watermark, signature, border, frame, vignette, drop
shadow, gradient, outline stroke, background colour, paper texture, props, hands,
plates, bowls, packaging, price tag, photorealism, 3D render, bokeh, depth of field.

Output
Square 1:1, 1024 × 1024, transparent PNG.
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

Nano Banana / Gemini 계열의 일관성은 문장이 아니라 첨부 이미지에서 나온다. 생성기는
아직 최종 확정이 아니다 — 앵커 4장을 Gemini 계열·GPT Image 두 곳에서 뽑아 비교한 뒤
고른다. Midjourney는 투명배경을 못 만들어 70번의 누끼 작업이 붙으므로 제외한다.

### 5.3 슬롯 사전

부록 A. 70행 × 4슬롯. 항목이 이미지를 공유하는 경우는 부록 B.

## 6. 검수 게이트

뽑은 즉시 넷을 본다. 하나라도 걸리면 재생성한다.

1. **배경이 진짜 투명한가** — 반투명 흰 테두리·회색 헤일로가 흔하다
2. **그림자가 섞였나** — 이 컨셉은 그림자 0
3. **점유율이 ~80%인가** — 후처리로 교정하되, 피사체가 잘려 나갔으면 재생성
4. **96px로 줄였을 때 무엇인지 읽히는가** — 최종 기준. 1024px에서 아름다운 것과
   96px에서 읽히는 것은 다르다

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
- `src/app.ts` — 변경 없음 (`SeasonHint`는 이모지 유지, 아래)
- `src/components/ProduceCard.tsx` — `image`가 있으면 96px `<img>`, 없으면 기존
  이모지 `<span>`

```tsx
{card.image
  ? <img src={`${import.meta.env.BASE_URL}assets/produce/${card.image}.webp`}
         width={96} height={96} loading="lazy" alt="" />
  : <span className={styles.emoji}>{card.emoji}</span>}
```

- `alt=""` — 품목명이 바로 옆에 있다. alt를 채우면 스크린리더가 이름을 두 번 읽는다.
  장식이 아니라 **중복**이라서 비운다.
- `width`/`height` 명시로 CLS 방지. lazy 로드 중 카드 높이가 튀지 않아야 한다.
- 경로에 `import.meta.env.BASE_URL`을 쓴다 — 하위경로 배포(`/jecheori/`)에서
  깨지지 않게 (`CLAUDE.md` 배포 절).

### 8.3 `SeasonHint`는 이모지 유지

검색 결과·비제철 힌트 줄은 **본문 크기 텍스트 줄**이다. 실사 벡터를 24px로 넣으면
읽히지 않는다. 카드는 그림의 자리고 목록 줄은 글자의 자리라, 다른 게 맞다.

### 8.4 테스트

- `src/components/ProduceCard.test.tsx` — `image` 있을 때 `<img>` 렌더 / 없을 때
  이모지 폴백, 두 케이스
- 게이트는 `npm test` **와** `npx tsc --noEmit` 둘 다
- **브라우저 실측 필수** — 96px 실제 렌더, lazy 로드 중 레이아웃 안 튀는지,
  크림 종이 위 알파 경계에 헤일로 없는지

## 9. DESIGN.md 개정 2건

1. **"카드 안엔 장식 일러스트를 두지 않는다"에 예외를 연다.** 식별 도판은 장식이
   아니다 — 정보 그래픽(볼드 가격·등락 칩·스파크라인·제철 띠)을 카드에 허용한 것과
   같은 논리다. 머리말 스케치 1점 규칙(시그니처)은 그대로다.

2. **색 규율에 단서를 단다.** "텍스트·링크·버튼은 오직 쪽빛이 소유한다"는 그대로
   유지된다. 이미지는 배경 도형(블롭·마스킹테이프·칩 배경)처럼 자연색을 가질 수
   있다 — 다만 **이미지 위에 글자를 얹지 않는다.** 그라데이션 금지도 유지되며,
   에셋이 하드 엣지 색면이라 실질적으로 지켜진다.

## 10. 이번 범위 밖

**카드 레이아웃 전면 개편.** 96px가 들어오면 표지가 3열(그림 · 이름/제철띠 ·
가격)이 되는데, 이건 그 자체로 시안이 필요한 결정이다. 이번 사이클은 **에셋 시스템
+ 그림이 들어갈 슬롯**까지만 하고, 레이아웃은 에셋이 실제로 손에 잡힌 뒤 다시
시안을 만든다. 순서를 뒤집으면 상상 속 그림에 맞춰 레이아웃을 짜게 된다.

## 11. 표면화한 결정 (부재로 나타나는 것들)

`CLAUDE.md` "데이터·정책 결정" 규칙에 따라, **안 하는 것**을 적어 둔다:

- **등급을 그림으로 안 가른다** — 한우 15항목이 5장을 공유한다. 화면엔 "등급이
  달라도 그림이 같다"로 나타난다.
- **원산지를 그림으로 안 가른다** — 수입 삼겹살과 국내 삼겹살이 같은 장을 쓴다.
- **품종을 그림으로 안 가른다** — `kind`(햇사레 등)는 텍스트로만 구별된다.
  포도/샤인머스캣, 참외/멜론처럼 겉모습이 다른 것만 별개 장이다.
- **점진 도입** — 70장이 다 될 때까지 에셋 없는 품목은 이모지로 보인다. 한 화면에
  도판과 이모지가 섞여 보이는 기간이 있다.
- **다크모드 없음** — 앱에 없으므로 에셋도 단일 버전.

## 12. 순서

1. 앵커 4장 생성 → 검수 게이트 → 프롬프트 동결 → **사인오프**
2. 생성기 최종 확정 (Gemini 계열 vs GPT Image, 앵커 4장으로 비교)
3. 나머지 66장 양산 + 검수
4. 후처리 파이프라인 1회 실행 → `public/assets/produce/`
5. `produce.json` `image` 필드 채우기
6. 타입·`card.ts`·`ProduceCard` + 테스트
7. `DESIGN.md` 개정 2건
8. 브라우저 실측 → 스크린샷 사인오프

1번이 게이트다. 앵커가 통과하기 전엔 66장을 뽑지 않는다.

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
| `grape` | 포도 | one whole bunch of Campbell Early grapes | with the woody stem and two vine leaves | near-black purple berries under a dusty pale bloom; leaves deep green |
| `shine-muscat` | 샤인머스캣 | one whole bunch of Shine Muscat grapes | with the woody stem and one vine leaf | translucent yellow-green berries, glossy, no bloom |
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
| `hanwoo-round` | 한우 설도 | one lean round steak slice | a broad flat cut with little fat and a thin silver connective seam | deep red lean, sparse marbling |
| `hanwoo-brisket` | 한우 양지 | one brisket block with the grain running lengthwise | coarse long muscle fibre and a fat layer along one edge | dark red lean with pronounced long grain; cream fat layer |
| `hanwoo-rib` | 한우 갈비 | two bone-in short-rib pieces, stacked | the cut rib bone in cross-section | deep red meat layered with cream fat; bone pale ivory with a rose marrow centre |
| `imported-beef-rib` | 수입 소갈비 | two bone-in beef short ribs, stacked | the cut rib bone in cross-section | bright red meat with thicker cream fat layers; bone pale ivory |
| `imported-beef-ribmeat` | 수입 소갈비살 | one boneless rib-meat slab | no bone; wide muscle seams running through the cut | bright red lean with wide cream fat seams between muscle layers |
| `pork-front-leg` | 돼지 앞다리살 | one block of pork shoulder | several muscle seams and a thin fat cap | pale rose-pink lean with cream fat seams |
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
