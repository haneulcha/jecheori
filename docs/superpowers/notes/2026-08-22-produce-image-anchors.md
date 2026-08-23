# 앵커 도판 4장 — 프롬프트 · 검수 · 실측 (게이트 1)

스펙: `docs/superpowers/specs/2026-08-22-produce-image-assets-design.md`
플랜: `docs/superpowers/plans/2026-08-22-produce-image-assets.md` Task 2

앵커 4장이 통과하면 프롬프트를 **동결**하고, 이후 66장은 슬롯 4개
(`COMPOSITION`·`PARTS`·`COLOUR_NOTE`·`ITEM_KR`)만 갈아끼우며 뽑는다.
나머지 문장이 70장을 한 세트로 묶는 유일한 장치이므로, 동결 후엔 손대지 않는다.

앵커 넷은 형태 난이도와 도판 문법이 서로 다르게 골랐다 — 과일(부속물 있음) ·
수산(측면 프로필) · 채소(단일 덩어리) · 축산(식물 부속물 없음, 해부학적 특징으로 대체).

---

## 생성 지침 (4장 공통)

- 출력: **1024×1024 투명 PNG**
- 두 생성기에서 각각 4장씩 뽑아 비교한다 — **Gemini 계열(Nano Banana)** vs **GPT Image**.
  Midjourney는 투명배경을 못 만들어 70번의 누끼 작업이 붙으므로 제외.
- 뽑은 PNG는 한 폴더에 `peach.png` · `mackerel.png` · `cabbage.png` ·
  `hanwoo-sirloin.png`로 저장한다 (후처리 CLI가 파일명을 그대로 쓴다).
- **점유율 80%는 사람이 맞추지 않는다** — 후처리가 강제한다. 생성 단계에서는
  피사체가 **잘리지만 않으면** 된다.

---

## 프롬프트 4개 (그대로 복사)

### 1. `peach` — 복숭아 (과일)

```
Subject
two whole peaches, one upright and one tilted beside it — with two attached leaves
and a short cut stem. Korean market produce, 복숭아.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture and leaf veining survive. Hard-edged colour fields only (no
gradients), but stepped finely enough to read as photographic. No outline stroke,
no grain.

Colour
True-to-life natural colour: cream-yellow to apricot skin with a deep carmine blush
on the sunward cheek; leaves muted olive-green. Do not stylise, tint or desaturate
the subject's own colour.

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

### 2. `mackerel` — 고등어 (수산)

```
Subject
one whole chub mackerel in full lateral profile — with dorsal, pectoral and tail
fins intact. Korean market produce, 고등어.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture and leaf veining survive. Hard-edged colour fields only (no
gradients), but stepped finely enough to read as photographic. No outline stroke,
no grain.

Colour
True-to-life natural colour: steel blue-green back with dark oblique wave-bands,
sharply divided from a silver-white belly. Do not stylise, tint or desaturate the
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

### 3. `cabbage` — 양배추 (채소)

```
Subject
one whole green cabbage — with two loose outer wrapper leaves attached at the base.
Korean market produce, 양배추.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture and leaf veining survive. Hard-edged colour fields only (no
gradients), but stepped finely enough to read as photographic. No outline stroke,
no grain.

Colour
True-to-life natural colour: pale jade interior grading to bluish sage on the
wrapper leaves; cream veins. Do not stylise, tint or desaturate the subject's own
colour.

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

### 4. `hanwoo-sirloin` — 한우 등심 (축산)

축산은 식물 부속물이 없어 `PARTS`가 **그 부위를 그 부위이게 하는 해부학적 특징**을
담는다. 여기서는 등심의 넓은 심(eye)과 바깥 지방캡 — 이게 없으면 96px에서 설도·양지와
구별되지 않는다.

```
Subject
one thick sirloin steak on its own — the broad eye of the loin with its outer fat
cap. Korean market produce, 한우 등심.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture and leaf veining survive. Hard-edged colour fields only (no
gradients), but stepped finely enough to read as photographic. No outline stroke,
no grain.

Colour
True-to-life natural colour: deep cherry-red lean with dense fine white marbling;
cream-white fat cap. Do not stylise, tint or desaturate the subject's own colour.

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

---

## 동결 이후 — 나머지 66장에 붙일 문장

앵커가 통과하면, 이후 생성에는 **앵커 4장을 레퍼런스 이미지로 첨부**하고 프롬프트
맨 앞에 이 문장을 붙인다. Gemini 계열의 일관성은 문장이 아니라 첨부 이미지에서 온다.

```
Match the flattening level, edge quality, lighting and framing of the attached
reference plates exactly. Only the subject changes.
```

---

## 검수 기록 (뽑은 뒤 채운다)

검수 게이트는 스펙 §6의 6항목. 앵커 단계에선 6번(혼동군)의 비교 상대가 없어
양산 단계에서 본다.

| 항목 | peach | mackerel | cabbage | hanwoo-sirloin |
|---|---|---|---|---|
| ① 배경 진짜 투명 (헤일로 없음) | | | | |
| ② 그림자 0 | | | | |
| ③ 잘림 없음 (80%는 후처리 몫) | | | | |
| ④ 96px로 줄여 읽히나 | | | | |
| ⑤ 순백 위 윤곽이 서나 | | | | |
| ⑥ 혼동군 — 양산에서 | — | — | — | — |

⑤는 `hanwoo-sirloin`의 크림빛 지방캡과 `cabbage`의 밝은 겉잎이 특히 위험하다.
녹으면 **자연색 범위 안에서 음영을 깊게** 재생성한다 — 외곽선을 넣거나 색을
보정하지 않는다(스펙 §3 동결).

### 프롬프트 수정 이력

앵커가 게이트를 못 넘어 프롬프트를 고쳤다면 여기에 남긴다 — 무엇을, 왜, 어느 블록을.
동결 전에만 고칠 수 있다.

| 회차 | 고친 블록 | 무엇을 | 왜 |
|---|---|---|---|
| | | | |

---

## 용량 실측 (후처리 후)

```bash
node scripts/normalize-produce-images.mjs <앵커 PNG 폴더> /tmp/anchors-out
```

| image | 288 WebP 크기 |
|---|---|
| `peach` | |
| `mackerel` | |
| `cabbage` | |
| `hanwoo-sirloin` | |

스펙 §4의 총용량 추정(70장 ≈ 1.0–1.4MB)을 이 실측으로 갱신한다. 비늘(`mackerel`)·
마블링(`hanwoo-sirloin`)이 고밀도라 25–35KB로 튈 수 있다 — 추정만 믿지 않는다.

---

## 생성기 비교 · 확정

| | Gemini 계열 (Nano Banana) | GPT Image |
|---|---|---|
| 투명배경 품질 | | |
| 색면 평탄화가 지시대로 되나 | | |
| 그림자 억제가 되나 | | |
| 4장의 세트감 | | |
| 96px 판독 | | |

**확정 생성기:** (게이트 1에서 기록)
**동결 선언:** (날짜 · 위 프롬프트 4개가 최종본임을 확인)
