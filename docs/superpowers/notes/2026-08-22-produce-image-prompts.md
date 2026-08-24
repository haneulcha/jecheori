# 양산 프롬프트 66행 — 앵커 뺀 나머지 (Task 8)

스펙: `docs/superpowers/specs/2026-08-22-produce-image-assets-design.md` (§5.1 포맷 · 부록 A 슬롯 사전)
플랜: `docs/superpowers/plans/2026-08-22-produce-image-assets.md` Task 8
앵커·동결 기록: `docs/superpowers/notes/2026-08-22-produce-image-anchors.md`

**프롬프트는 2026-08-23 동결됐다.** 아래 66행은 동결된 8블록에 부록 A의 슬롯 4개
(`COMPOSITION`·`PARTS`·`COLOUR_NOTE`·`ITEM_KR`)만 갈아끼운 것이다. 고정 6블록
(Style·View·Light·Background·Do not include·Output)은 앵커 4장과 **한 글자도 다르지 않다** —
그게 70장을 한 세트로 묶는 유일한 장치다. 여기서 손대지 않는다.

배치: 과일 11 → 채소 27 → 수산 15 → 축산 13 = **66장**
(앵커 4장을 더해 70장.)

---

## 매 생성마다 지키는 것

1. **앵커 4장을 레퍼런스 이미지로 첨부한다** (`public/assets/produce/`의 것이 아니라
   원본 PNG — 없으면 288 WebP라도. 일관성은 문장이 아니라 첨부 이미지에서 온다).
2. 프롬프트 **맨 앞에** 이 문장을 붙인다 (스펙 §5.2, 원문 그대로):

```
Match the flattening level, edge quality, lighting and framing of the attached
reference plates exactly. Only the subject changes.
```

3. **한 번에 하나씩 생성한다.** 여러 프롬프트를 한 번에 넣으면 Gemini가 대지 한 장에
   몰아 그리고 라벨 글자까지 박는다 (앵커 2회차 실패 모드).
4. 파일명은 **`{image}.png`** — 후처리 CLI가 파일명을 그대로 쓴다 (`grape.png` → `grape.webp`).
5. 배경은 **평면 마젠타 `#FF00FF`**, 1024×1024 이상 PNG. 투명이 아니다.
6. 점유율 80%는 맞추지 않아도 된다 — 후처리가 강제한다. **잘리지만 않으면 된다.**

배치를 다 뽑았으면:

```bash
node scripts/normalize-produce-images.mjs <배치 폴더>   # → public/assets/produce/
npm test                                                # produce-images 동기화 가드
```

배경이 안 빠지거나 프롬프트 위반 조각(라벨·반짝이)이 남으면 **조용히 통과하지 않고
종료코드 1로 세운다.** 워터마크(0.14~0.18%)는 떼면서 무엇을 얼마나 뗐는지 로그로 남긴다.

## 검수 6항목 (스펙 §6 — 뽑은 즉시)

① 배경이 평면 마젠타 한 색 ② 그림자 0 ③ 잘림 없음 ④ **96px로 읽히나**
⑤ 순백 위 윤곽 (⚠️ 표시된 행) ⑥ **혼동군을 96px로 나란히** (배치 머리의 목록)

⑤가 걸리면 **자연색 범위 안에서 음영을 깊게** 재생성한다 — 외곽선을 넣거나 색을
보정하지 않는다 (스펙 §3 동결).

---

## 과일 — 11장

**혼동군 (96px로 나란히):** `grape` · `shine-muscat` — 색(흑자 vs 연두)과 분(bloom) 유무로 갈린다.

앵커 `peach`는 이미 배치돼 있다 — 여기 없다.

### `watermelon` — 수박

```
Subject
one whole watermelon with a thick wedge cut and leaning against it — with the wedge
showing flesh, seeds and rind in cross-section. Korean market produce, 수박.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep green rind with dark serpentine stripes; crimson flesh,
pale green-white rind band, glossy black seeds. Do not stylise, tint or desaturate the
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

### `korean-melon` — 참외

```
Subject
two whole Korean melons, one standing and one lying — with shallow white longitudinal
furrows and a small dry stem scar. Korean market produce, 참외.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: vivid canary-yellow skin with ten white furrows; matte, not
glossy. Do not stylise, tint or desaturate the subject's own colour.

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

### `apple` — 사과

```
Subject
two whole apples, one upright and one tilted — with a short woody stem and one attached
leaf. Korean market produce, 사과.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep red skin streaked with yellow-green striations and pale
lenticel flecks. Do not stylise, tint or desaturate the subject's own colour.

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

### `pear` — 배

```
Subject
two whole Korean pears, round rather than tapered — with a short stem and a wide sunken
calyx. Korean market produce, 배.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: russet golden-brown skin densely freckled with pale
lenticels. Do not stylise, tint or desaturate the subject's own colour.

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

### `grape` — 포도

```
Subject
one whole bunch of Campbell Early grapes — with the woody stem and two vine leaves. Korean
market produce, 포도.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: near-black purple berries under a dusty pale bloom; leaves
deep green. Do not stylise, tint or desaturate the subject's own colour.

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

### `shine-muscat` — 샤인머스캣

```
Subject
one whole bunch of Shine Muscat grapes — with the woody stem and one vine leaf. Korean
market produce, 샤인머스캣.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: translucent yellow-green berries, glossy, no bloom. Do not
stylise, tint or desaturate the subject's own colour.

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

### `mandarin` — 감귤

```
Subject
three whole mandarins and one peeled segment — with two attached leaves on the top fruit.
Korean market produce, 감귤.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: bright orange dimpled skin; the segment a lighter translucent
orange. Do not stylise, tint or desaturate the subject's own colour.

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

### `sweet-persimmon` — 단감

```
Subject
two whole sweet persimmons, flat-round rather than pointed — with the four-lobed calyx on
top. Korean market produce, 단감.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: orange-vermilion skin, smooth and slightly waxy; calyx dry
sage-brown. Do not stylise, tint or desaturate the subject's own colour.

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

### `kiwi` — 참다래

```
Subject
two whole kiwifruit and one cut half — with the cut half showing the pale radial core and
black seed ring. Korean market produce, 참다래.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: matte fuzzy russet-brown skin; interior vivid lime-green with
a white core. Do not stylise, tint or desaturate the subject's own colour.

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

### `strawberry` — 딸기

```
Subject
three whole strawberries, one tilted forward — with green calyx and short stem on each.
Korean market produce, 딸기.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: glossy scarlet with pale yellow seeds set in dimples; calyx
bright green. Do not stylise, tint or desaturate the subject's own colour.

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

### `melon` — 멜론

```
Subject
one whole netted melon with a wedge cut and leaning against it — with raised cream netting
across the rind and the wedge showing the seed cavity. Korean market produce, 멜론.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: sage-green rind under cream netting; pale green-orange flesh.
Do not stylise, tint or desaturate the subject's own colour.

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

## 채소 — 27장

**혼동군 (96px로 나란히):** `napa-cabbage` · `eolgari-cabbage`(여문 통 vs 벌어진 단) · `radish` · `young-radish`(굵은 통 하나 vs 가는 뿌리 여럿+잎) · `green-onion` · `scallion`(굵은 흰 대 vs 둥근 알뿌리) · `garlic-chives` · `minari` · `scallion`(납작한 잎날 vs 속 빈 줄기+갈래잎 vs 알뿌리).
**흰 피사체 위험군:** `garlic` · `napa-cabbage`.

앵커 `cabbage`는 이미 배치돼 있다 — 여기 없다.

### `tomato` — 토마토

```
Subject
two whole tomatoes, one upright and one tilted — with the green star calyx and short stem.
Korean market produce, 토마토.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep scarlet, glossy; calyx bright green. Do not stylise,
tint or desaturate the subject's own colour.

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

### `cucumber` — 오이

```
Subject
two whole Korean cucumbers laid at a slight angle — with the small dry blossom end and
fine surface ridges. Korean market produce, 오이.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep green with paler longitudinal ridges and small pale
spines. Do not stylise, tint or desaturate the subject's own colour.

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

### `zucchini` — 애호박

```
Subject
two whole aehobak, the short plump Korean zucchini — with a short cut stem. Korean market
produce, 애호박.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale jade green, matte and smooth, no stripes. Do not
stylise, tint or desaturate the subject's own colour.

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

### `potato` — 감자

```
Subject
three whole potatoes clustered together — with shallow eyes and a little dry soil in the
creases. Korean market produce, 감자.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale buff-brown skin with faint earthy patches; matte. Do not
stylise, tint or desaturate the subject's own colour.

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

### `corn` — 옥수수

```
Subject
two ears of corn, one husked and one half-husked — with the pulled-back green husk and
pale silk. Korean market produce, 옥수수.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale yellow-white kernels in even rows; husk fresh green,
silk cream. Do not stylise, tint or desaturate the subject's own colour.

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

### `spinach` — 시금치

```
Subject
one bunch of spinach with roots attached — with crinkled leaves and the root crown. Korean
market produce, 시금치.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep green crinkled leaves; root crown magenta-pink. Do not
stylise, tint or desaturate the subject's own colour.

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

### `napa-cabbage` — 배추 ⚠️ 흰 피사체

```
Subject
one whole napa cabbage, upright — with loose outer leaves opening at the base. Korean
market produce, 배추.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: thick white ribs grading to pale yellow-green crinkled leaf
tips. Do not stylise, tint or desaturate the subject's own colour.

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

### `lettuce` — 상추

```
Subject
one loose head of Korean red leaf lettuce — with ruffled leaf edges. Korean market
produce, 상추.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: green leaves washed with burgundy at the ruffled edges. Do
not stylise, tint or desaturate the subject's own colour.

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

### `eolgari-cabbage` — 얼갈이배추

```
Subject
one bundle of eolgari, young open-leaf napa cabbage — with long white ribs and open green
leaf tops. Korean market produce, 얼갈이배추.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: slender white ribs, bright green loose leaves. Do not
stylise, tint or desaturate the subject's own colour.

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

### `garlic-chives` — 부추

```
Subject
one flat bundle of garlic chives — with the pale cut ends aligned. Korean market produce,
부추.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: flat deep green blades, pale white-green at the cut ends. Do
not stylise, tint or desaturate the subject's own colour.

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

### `perilla-leaf` — 깻잎

```
Subject
a small stack of perilla leaves, the top leaf fully visible — with serrated edges,
prominent veins and short stems. Korean market produce, 깻잎.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep green with a purple cast on the underside; matte. Do not
stylise, tint or desaturate the subject's own colour.

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

### `sweet-pumpkin` — 단호박

```
Subject
one whole kabocha with a wedge cut beside it — with a short woody stem and the wedge
showing flesh and seeds. Korean market produce, 단호박.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: dark green rind with pale grey-green mottling; flesh deep
marigold. Do not stylise, tint or desaturate the subject's own colour.

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

### `cherry-tomato` — 방울토마토

```
Subject
five cherry tomatoes clustered, two still on the vine — with the green vine truss and star
calyxes. Korean market produce, 방울토마토.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: glossy deep red; vine bright green. Do not stylise, tint or
desaturate the subject's own colour.

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

### `eggplant` — 가지

```
Subject
two whole Korean eggplants, long and slender — with the calyx and short stem. Korean
market produce, 가지.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: glossy deep violet-black; calyx green flushed purple. Do not
stylise, tint or desaturate the subject's own colour.

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

### `green-chili` — 풋고추

```
Subject
three whole green chilies, slightly crooked — with green stems attached. Korean market
produce, 풋고추.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: bright grass-green with a light sheen. Do not stylise, tint
or desaturate the subject's own colour.

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

### `paprika` — 파프리카

```
Subject
two bell peppers, one red and one yellow, side by side — with green stems and shoulders.
Korean market produce, 파프리카.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: one deep scarlet and one canary yellow, both high-gloss;
stems green. Do not stylise, tint or desaturate the subject's own colour.

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

### `radish` — 무

```
Subject
one whole Korean radish laid at a slight angle — with the cut green leaf crown. Korean
market produce, 무.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: white body shading to pale green at the crown; leaves deep
green. Do not stylise, tint or desaturate the subject's own colour.

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

### `young-radish` — 열무

```
Subject
one bundle of young summer radishes with tops — with slender roots and long leaves. Korean
market produce, 열무.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: slim white-pink roots; leaves bright fresh green. Do not
stylise, tint or desaturate the subject's own colour.

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

### `carrot` — 당근

```
Subject
three whole carrots laid side by side — with the trimmed green stem tufts. Korean market
produce, 당근.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: saturated orange with fine pale rings; stem tufts green. Do
not stylise, tint or desaturate the subject's own colour.

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

### `broccoli` — 브로콜리

```
Subject
one whole broccoli crown with the stalk — with the thick cut stalk and two small leaves.
Korean market produce, 브로콜리.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep blue-green tight florets; stalk pale green with a cream
cut face. Do not stylise, tint or desaturate the subject's own colour.

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

### `green-onion` — 대파

```
Subject
one bundle of three large green onions — with white shanks, root hairs and long green
tops. Korean market produce, 대파.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: white shanks grading to deep green tops; roots pale cream. Do
not stylise, tint or desaturate the subject's own colour.

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

### `scallion` — 쪽파

```
Subject
one bundle of small scallions — with rounded white bulbs and root hairs. Korean market
produce, 쪽파.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: white-pink bulbs, slender bright green tops. Do not stylise,
tint or desaturate the subject's own colour.

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

### `onion` — 양파

```
Subject
three whole onions clustered, one with its papery skin peeling — with the dry neck and
papery outer skin. Korean market produce, 양파.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: golden-bronze papery skin with fine vertical lines; the
peeled edge pale ivory. Do not stylise, tint or desaturate the subject's own colour.

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

### `garlic` — 마늘 ⚠️ 흰 피사체

```
Subject
one whole garlic head with two separated cloves beside it — with the papery wrapper and
dry stem stub. Korean market produce, 마늘.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: ivory-white papery skin with faint violet veining; cloves
pale cream. Do not stylise, tint or desaturate the subject's own colour.

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

### `ginger` — 생강

```
Subject
one whole knobbly ginger rhizome — with branching knuckles and one cut face. Korean market
produce, 생강.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale tan skin, matte and slightly fibrous; cut face pale
yellow. Do not stylise, tint or desaturate the subject's own colour.

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

### `sweet-potato` — 고구마

```
Subject
three whole sweet potatoes clustered — with tapered ends and shallow root scars. Korean
market produce, 고구마.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep red-purple skin, matte. Do not stylise, tint or
desaturate the subject's own colour.

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

### `minari` — 미나리

```
Subject
one bundle of water dropwort — with hollow pale stems and small serrated leaflets. Korean
market produce, 미나리.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale green hollow stems, deeper green leaflets. Do not
stylise, tint or desaturate the subject's own colour.

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

## 수산 — 15장

**혼동군 (96px로 나란히):** `mackerel`(앵커) · `spanish-mackerel` — 등의 물결무늬 vs 옆줄의 둥근 반점.
**흰 피사체 위험군:** `hairtail` · `dried-anchovy`.

앵커 `mackerel`는 이미 배치돼 있다 — 여기 없다.

### `hairtail` — 갈치 ⚠️ 흰 피사체

```
Subject
one whole hairtail, its long ribbon body in a loose S curve — with the long dorsal fin
ribbon and pointed head. Korean market produce, 갈치.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: uniform bright metallic silver, almost mirror-like; dark eye.
Do not stylise, tint or desaturate the subject's own colour.

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

### `croaker` — 조기

```
Subject
one whole yellow croaker in lateral profile — with fins and tail intact. Korean market
produce, 조기.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale golden-yellow belly and fins, grey-brown back, silvery
flank. Do not stylise, tint or desaturate the subject's own colour.

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

### `spanish-mackerel` — 삼치

```
Subject
one whole Spanish mackerel in lateral profile — with a long slender body, forked tail and
fins intact. Korean market produce, 삼치.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: blue-grey back with scattered dark round spots along the
flank; silver belly. Do not stylise, tint or desaturate the subject's own colour.

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

### `saury` — 꽁치

```
Subject
two whole saury laid side by side, heads opposed — with slender pointed jaws and forked
tails. Korean market produce, 꽁치.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: dark blue-black back with a sharp silver band along the
flank; lower jaw tipped yellow. Do not stylise, tint or desaturate the subject's own
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

### `squid` — 물오징어

```
Subject
one whole common squid, mantle upright, arms fanned below — with two triangular fins,
eight arms and two long tentacles. Korean market produce, 물오징어.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: translucent cream mantle mottled with red-brown
chromatophores; arms paler. Do not stylise, tint or desaturate the subject's own colour.

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

### `abalone` — 전복

```
Subject
two whole abalone, one shell-side up and one foot-side up — with the row of respiratory
pores along the shell rim. Korean market produce, 전복.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: shell dark green-brown outside, iridescent blue-green nacre
inside; foot pale beige. Do not stylise, tint or desaturate the subject's own colour.

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

### `shrimp` — 새우

```
Subject
three whole raw shrimp, curled — with long antennae, legs and tail fans. Korean market
produce, 새우.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: translucent grey-pink shell with faint darker banding; tail
fan tipped red-orange. Do not stylise, tint or desaturate the subject's own colour.

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

### `blue-crab` — 꽃게

```
Subject
one whole blue crab seen from above — with both claws raised, all legs and the spined
carapace edge. Korean market produce, 꽃게.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: mottled blue-grey and olive carapace; claw tips deep
orange-red; underside cream. Do not stylise, tint or desaturate the subject's own colour.

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

### `mussel` — 홍합

```
Subject
a small cluster of five mussels — with closed shells, the hinge and a few byssal threads.
Korean market produce, 홍합.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: glossy blue-black shells with brown-purple growth rings. Do
not stylise, tint or desaturate the subject's own colour.

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

### `clam` — 바지락

```
Subject
a small heap of seven Manila clams — with closed ridged shells. Korean market produce,
바지락.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: cream, grey and brown shells with dark zigzag and ray
patterning. Do not stylise, tint or desaturate the subject's own colour.

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

### `octopus` — 낙지

```
Subject
one whole small octopus, head up, arms trailing — with eight long slender arms and visible
suckers. Korean market produce, 낙지.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale grey-beige mottled with red-brown; suckers cream. Do not
stylise, tint or desaturate the subject's own colour.

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

### `cockle` — 꼬막

```
Subject
a small heap of six cockles — with deeply ribbed fan-shaped shells. Korean market produce,
꼬막.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: chalky grey-white to tan shells with strong radiating ribs.
Do not stylise, tint or desaturate the subject's own colour.

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

### `laver` — 김

```
Subject
a stack of three sheets of dried laver, the top sheet slightly offset — with the slightly
rough uneven edges of each sheet. Korean market produce, 김.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: near-black with a deep green-purple sheen; matte with a faint
gloss on the pressed side. Do not stylise, tint or desaturate the subject's own colour.

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

### `dried-seaweed` — 마른미역

```
Subject
a small loose bundle of dried wakame fronds — with ruffled frond edges and visible
midribs. Korean market produce, 마른미역.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: very dark brown-green, nearly black, dry and matte. Do not
stylise, tint or desaturate the subject's own colour.

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

### `dried-anchovy` — 마른멸치 ⚠️ 흰 피사체

```
Subject
a small heap of dried anchovies, several fully visible — with intact heads, eyes and
tails. Korean market produce, 마른멸치.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: silvery-white bodies with a dark blue-grey dorsal line; dry
matte finish. Do not stylise, tint or desaturate the subject's own colour.

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

## 축산 — 13장

**혼동군 (96px로 나란히):** `hanwoo-sirloin`(앵커) · `hanwoo-round` · `hanwoo-brisket`(지방캡+촘촘한 마블링 vs 결 없는 민짜 vs 긴 결) · `hanwoo-rib` · `imported-beef-rib`(뼈 단면의 두께·비율 — Step 3의 판단 대상).
**흰 피사체 위험군:** `chicken-broiler` · `milk-white`.

앵커 `hanwoo-sirloin`는 이미 배치돼 있다 — 여기 없다.

### `hanwoo-tenderloin` — 한우 안심

```
Subject
one thick round tenderloin steak on its own — a clean trimmed cylinder with no bone.
Korean market produce, 한우 안심.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep cherry-red lean with very fine white marbling and a thin
cream fat edge. Do not stylise, tint or desaturate the subject's own colour.

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

### `hanwoo-round` — 한우 설도

```
Subject
one lean round steak slice — a broad flat cut with little fat and a thin silver connective
seam. Korean market produce, 한우 설도.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep red lean, sparse marbling. Do not stylise, tint or
desaturate the subject's own colour.

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

### `hanwoo-brisket` — 한우 양지

```
Subject
one brisket block with the grain running lengthwise — coarse long muscle fibre and a fat
layer along one edge. Korean market produce, 한우 양지.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: dark red lean with pronounced long grain; cream fat layer. Do
not stylise, tint or desaturate the subject's own colour.

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

### `hanwoo-rib` — 한우 갈비

```
Subject
two bone-in short-rib pieces, stacked — the cut rib bone in cross-section. Korean market
produce, 한우 갈비.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: deep red meat layered with cream fat; bone pale ivory with a
rose marrow centre. Do not stylise, tint or desaturate the subject's own colour.

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

### `imported-beef-rib` — 수입 소갈비

```
Subject
two bone-in beef short ribs, stacked — the cut rib bone in cross-section. Korean market
produce, 수입 소갈비.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: bright red meat with thicker cream fat layers; bone pale
ivory. Do not stylise, tint or desaturate the subject's own colour.

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

### `imported-beef-ribmeat` — 수입 소갈비살

```
Subject
one boneless rib-meat slab — no bone; wide muscle seams running through the cut. Korean
market produce, 수입 소갈비살.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: bright red lean with wide cream fat seams between muscle
layers. Do not stylise, tint or desaturate the subject's own colour.

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

### `pork-front-leg` — 돼지 앞다리살

```
Subject
one block of pork shoulder — several muscle seams and a thin fat cap. Korean market
produce, 돼지 앞다리살.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale rose-pink lean with cream fat seams. Do not stylise,
tint or desaturate the subject's own colour.

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

### `pork-belly` — 돼지 삼겹살

```
Subject
three slices of pork belly, fanned — the alternating lean and fat layers seen edge-on.
Korean market produce, 돼지 삼겹살.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: rose-pink lean striped with cream-white fat in clear bands.
Do not stylise, tint or desaturate the subject's own colour.

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

### `pork-rib` — 돼지 갈비

```
Subject
one rack section of pork ribs — the rib bones running through the meat. Korean market
produce, 돼지 갈비.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale rose meat with cream fat; bones ivory. Do not stylise,
tint or desaturate the subject's own colour.

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

### `pork-neck` — 돼지 목살

```
Subject
two thick pork neck steaks, overlapping — coarse marbled seams threading through the cut.
Korean market produce, 돼지 목살.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: rose-pink with coarse cream marbling. Do not stylise, tint or
desaturate the subject's own colour.

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

### `chicken-broiler` — 닭 ⚠️ 흰 피사체

```
Subject
one whole dressed chicken, breast up, legs tucked — wings folded, skin intact. Korean
market produce, 닭.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: pale cream-yellow skin with faint pink beneath; matte. Do not
stylise, tint or desaturate the subject's own colour.

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

### `egg` — 계란

```
Subject
five whole eggs clustered, one set slightly apart — intact shells, no carton or tray.
Korean market produce, 계란.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: warm light brown shells with faint speckling and a matte
chalky surface. Do not stylise, tint or desaturate the subject's own colour.

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

### `milk-white` — 흰우유 ⚠️ 흰 피사체

부정 프롬프트가 텍스트를 금지하므로 **카톤에 인쇄가 없다**(스펙 부록 A 주). 무지 카톤이
어색해도 컵에 따른 우유로 바꾸지 않는다 — 그러면 "장바구니에 담는 것"이 아니라 "마시는
것"이 되어 다른 69장과 결이 어긋난다.

```
Subject
one 1-litre gable-top milk carton, three-quarter view — the gable fold and side seam,
entirely unprinted. Korean market produce, 흰우유.

Style
High-fidelity vector trace of a photograph — 20 to 40 tonal steps per material, so
reflections, moisture, marbling and leaf veining survive. Hard-edged colour fields
only (no gradients), but stepped finely enough to read as photographic. This is not
a flat poster illustration: a six- or eight-colour simplification is wrong. No
outline stroke, no grain.

Colour
True-to-life natural colour: plain white carton with pale blue-grey shading on the
shadowed face. Do not stylise, tint or desaturate the subject's own colour.

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
