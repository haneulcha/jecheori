# 앵커 도판 4장 — 프롬프트 · 검수 · 실측 (게이트 1)

스펙: `docs/superpowers/specs/2026-08-22-produce-image-assets-design.md`
플랜: `docs/superpowers/plans/2026-08-22-produce-image-assets.md` Task 2

앵커 4장이 통과하면 프롬프트를 **동결**하고, 이후 66장은 슬롯 4개
(`COMPOSITION`·`PARTS`·`COLOUR_NOTE`·`ITEM_KR`)만 갈아끼우며 뽑는다.
나머지 문장이 70장을 한 세트로 묶는 유일한 장치이므로, 동결 후엔 손대지 않는다.

앵커 넷은 형태 난이도와 도판 문법이 서로 다르게 골랐다 — 과일(부속물 있음) ·
수산(측면 프로필·긴 형태) · 채소(단일 덩어리) · 축산(식물 부속물 없음, 해부학적
특징으로 대체).

**현재: 3회차 대기.** 회차별 결과와 무엇을 왜 고쳤는지는 아래 "회차 기록".

---

## 생성 지침 (4장 공통)

- 출력: **1024×1024 이상 PNG**. 배경은 **평면 마젠타 `#FF00FF`** — 투명이 아니다.
- 생성기: **Gemini 계열(Nano Banana)**. GPT Image 비교는 구독이 없어 미수행(스펙 §5.2).
- **한 번에 하나씩 생성한다.** 네 프롬프트를 한 번에 넣으면 Gemini가 2×2 대지 한 장에
  몰아 그리고 **라벨 글자까지 박는다**(2회차 실패 모드). 대화를 나눠 한 프롬프트당
  한 장씩 받는다.
- 파일명은 `peach.png` · `mackerel.png` · `cabbage.png` · `hanwoo-sirloin.png`
  (후처리 CLI가 파일명을 그대로 쓴다).
- **점유율 80%는 맞추지 않아도 된다** — 후처리가 강제한다. 잘리지만 않으면 된다.
- 뽑고 나서:

```bash
node scripts/normalize-produce-images.mjs <PNG 폴더> /tmp/anchors-out
```

  배경이 안 빠지면 **실패로 세우고 종료코드 1**을 낸다(조용히 통과 안 함).

---

## 프롬프트 4개 (그대로 복사)

### 1. `peach` — 복숭아 (과일)

```
Subject
two whole peaches, one upright and one tilted beside it — with two attached leaves and a
short cut stem. Korean market produce, 복숭아.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: cream-yellow to apricot skin with a deep carmine blush on
the sunward cheek; leaves muted olive-green. Do not stylise, tint or desaturate the
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

### 2. `mackerel` — 고등어 (수산)

1회차에서 96px 판독이 미달이었다. View 블록의 **대각선 규칙**이 이 장을 겨눈다 — 수평으로 눕히면 96×30 띠가 된다.

```
Subject
one whole chub mackerel in full lateral profile — with dorsal, pectoral and tail fins
intact. Korean market produce, 고등어.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: steel blue-green back with dark oblique wave-bands, sharply
divided from a silver-white belly. Do not stylise, tint or desaturate the subject's own
colour.

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

### 3. `cabbage` — 양배추 (채소)

```
Subject
one whole green cabbage — with two loose outer wrapper leaves attached at the base.
Korean market produce, 양배추.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale jade interior grading to bluish sage on the wrapper
leaves; cream veins. Do not stylise, tint or desaturate the subject's own colour.

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

### 4. `hanwoo-sirloin` — 한우 등심 (축산)

축산은 식물 부속물이 없어 `PARTS`가 **그 부위를 그 부위이게 하는 해부학적 특징**을
담는다. 여기서는 등심의 넓은 심(eye)과 바깥 지방캡 — 이게 없으면 96px에서 설도·양지와
구별되지 않는다.

```
Subject
one thick sirloin steak on its own — the broad eye of the loin with its outer fat cap.
Korean market produce, 한우 등심.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep cherry-red lean with dense fine white marbling;
cream-white fat cap. Do not stylise, tint or desaturate the subject's own colour.

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

---

## 동결 이후 — 나머지 66장에 붙일 문장

앵커가 통과하면, 이후 생성에는 **앵커 4장을 레퍼런스 이미지로 첨부**하고 프롬프트
맨 앞에 이 문장을 붙인다. Gemini 계열의 일관성은 문장이 아니라 첨부 이미지에서 온다.

```
Match the flattening level, edge quality, lighting and framing of the attached
reference plates exactly. Only the subject changes.
```

---

## 회차 기록

### 1회차 (2026-08-23) — 반려

Gemini 계열, 2048×2048 PNG 4장.

| 게이트 | peach | mackerel | cabbage | hanwoo-sirloin |
|---|---|---|---|---|
| ① 배경 | ✕ | ✕ | ✕ | ✕ |
| ② 그림자 0 | ○ | ○ | ○ | ○ |
| ③ 잘림 없음 | ○ | ○ | ○ | ○ |
| ④ 96px 판독 | ○ | **△** | ○ | ○ |
| ⑤ 순백 위 윤곽 | ○ | ○ | ○ | ○ |
| ⑥ 혼동군 | — | — | — | — |

반려 사유 둘:

1. **배경.** 4장 전부 알파가 100% 불투명이고, 포토샵 **체커보드 무늬를 픽셀로
   그려서** 줬다. "transparent background"를 문자 그대로 그린 것. 임시로 키잉해
   확인해 보니 그림 자체는 멀쩡했으나, 앵커는 66장에 레퍼런스로 붙는 기준이라
   임시방편으로 통과시키지 않는다.
2. **4장이 한 세트로 안 보인다.** `peach`가 색면 6~10단계로 **탈락안이었던 인쇄
   도판** 쪽으로 흘렀고, `mackerel`·`hanwoo-sirloin`은 의도한 20~40단계에 가까웠다.
   기준 자체가 갈리면 66장이 그 분산을 물려받는다.

부수 발견 — `mackerel`이 96px에서 미달. 80% 규칙이 긴 변을 맞추다 보니 수평으로
누운 생선이 96×30 띠가 되어 등의 물결무늬가 사라졌다. 갈치·오이·가지·대파·당근이
같은 처지라 개별 품목이 아니라 **규칙**의 문제로 보고 View 블록을 고쳤다.

**용량 실측** (임시 키잉 후 파이프라인 통과):

| image | 288 WebP |
|---|---|
| `mackerel` | 6.9KB |
| `peach` | 9.7KB |
| `cabbage` | 11.8KB |
| `hanwoo-sirloin` | 18.8KB |

평균 **11.8KB** → 70장 ≈ **830KB**. 스펙 §4의 추정(1.0–1.4MB)보다 가벼워
실측치로 갱신했다.

### 프롬프트 수정 이력 (1회차 → 2회차)

동결 전에만 고칠 수 있다. 전부 **고정 블록**이라 70장 전체에 걸린다.

| 블록 | 무엇을 | 왜 |
|---|---|---|
| Background | "Fully transparent" → **평면 마젠타 `#FF00FF`** + 무늬·그림자 금지 | 투명을 요구하면 체커보드를 그린다. 평면 한 색은 안정적으로 내주고 키잉이 깨끗하다 |
| Do not include | `checkerboard, transparency checker pattern, alpha checker, fake transparency` 추가 | 1회차 실패 모드를 이름으로 막는다 |
| Style | "not a flat poster illustration: a six- or eight-colour simplification is wrong" 추가 | "20 to 40"의 해석 폭이 넓어 `peach`가 탈락안 쪽으로 흘렀다 |
| View | "긴 피사체는 대각선으로 배치" 추가 | 96px에서 긴 것의 시각 질량이 둥근 것의 1/3. 대각선이 1.41배를 회수한다 |
| Output | "transparent PNG" → "PNG" | 더 이상 알파를 요구하지 않는다 |

후처리도 같이 바뀌었다 — 마젠타 키잉(테두리 flood fill) + 스필 제거(3px 띠)를
`scripts/lib/normalize-image.mjs`에 넣고, 배경이 안 빠진 이미지는 실패시킨다.

### 2회차 (2026-08-23) — 반려. **다만 그림 방향은 통과**

1회차 수정 3건이 전부 먹혔다:

- 배경이 평면 마젠타로 나왔다 — 체커보드 사라짐 ✓
- **고등어가 대각선으로 누웠다** ✓ — 96px에서 처음으로 "생선"이 아니라 "고등어"로
  읽힌다. View 규칙 변경이 정확히 겨눈 곳에 맞았다
- 4장의 평탄화 밀도가 1회차보다 고르다 — `peach`의 인쇄 도판 쪽 쏠림이 줄었다

반려 사유는 **프롬프트가 아니라 투입 방식**이다. 네 프롬프트를 한 번에 넣어 Gemini가
2×2 대지 한 장(2048²)에 몰아 그렸고, 그 결과:

1. 낱장이 아니다 — 사분면을 잘라야 쓴다
2. **`peach`·`mackerel` 같은 라벨 글자가 박혔다** — `Do not include`의 `text, labels`
   위반. 마젠타를 빼내도 글자는 섬으로 남아 **bbox를 끌어당긴다**(피사체가 아래로
   밀리고 작아진다). 실측으로 확인
3. 사분면 경계에 흰 구분선 — 잘라낸 조각의 테두리가 흰색이라 flood fill이 시작점을
   못 찾아 4장 전부 `배경이 제거되지 않았다`로 실패
4. 스테이크에 ✦ 반짝이 장식

**부스러기 실측** (구분선을 피해 16px 안쪽으로 잘라 통과시킨 뒤):

| image | 조각 수 | 본체 | 부스러기 최대 |
|---|---|---|---|
| `peach` | 6 | 98.3% | 0.45% |
| `cabbage` | 8 | 97.6% | 0.43% |
| `mackerel` | 9 | 95.5% | 0.77% |
| `hanwoo-sirloin` | 18 | 95.8% | 0.75% |

부스러기는 전부 **0.8% 미만**, 본체는 **95% 이상**. 정상 구성요소와 자릿수가 달라
(복숭아 세 알이면 각 33%, 마늘 쪽 하나도 10%대) 후처리에 **1% 미만 조각 검출**을
넣었다. 조용히 지우지 않고 실패시킨다 — 부스러기가 있다는 건 생성기가 지시를 어겼다는
뜻이고, 그건 사람이 알아야 할 사실이다.

### 프롬프트 수정 이력 (2회차 → 3회차)

| 블록 | 무엇을 | 왜 |
|---|---|---|
| Do not include | `captions, sparkle, star, glint, decorative flourish, grid, collage, multiple panels` 추가 | 2회차가 대지·라벨·반짝이를 냈다 |

**그림 방향은 안 건드린다.** Style·View·Colour·Light·Background는 2회차 그대로다 —
그 넷은 통과했다.

### 3회차 — 대기

| 게이트 | peach | mackerel | cabbage | hanwoo-sirloin |
|---|---|---|---|---|
| ① 배경 평면 마젠타 | | | | |
| ② 그림자 0 | | | | |
| ③ 잘림 없음 | | | | |
| ④ 96px 판독 | | | | |
| ⑤ 순백 위 윤곽 | | | | |
| ⑥ 혼동군 — 양산에서 | — | — | — | — |
| **세트감** (4장이 같은 평탄화인가) | | | | |

⑤는 `hanwoo-sirloin`의 크림빛 지방캡과 `cabbage`의 밝은 겉잎이 특히 위험하다.
녹으면 **자연색 범위 안에서 음영을 깊게** 재생성한다 — 외곽선을 넣거나 색을
보정하지 않는다(스펙 §3 동결).

**동결 선언:** (통과 시 날짜와 함께 여기에)
