import sharp from 'sharp'

export const SIZE = 288
export const OCCUPANCY = 0.8
/** 배경 키 컬러 — 마젠타. 제철 품목에 이 색은 없다.
 *  "투명 배경"을 달라고 하면 Gemini 계열은 포토샵 체커보드를 **픽셀로 그려서** 준다
 *  (1회차 앵커 4장이 전부 그랬다). 그래서 평면 키 컬러를 요구하고 여기서 빼낸다. */
export const KEY = { r: 255, g: 0, b: 255 }
/** 이 미만의 알파는 헤일로(생성기가 흔히 남기는 반투명 테두리)로 보고
 *  완전 투명 처리 + bbox 계산에서 제외한다. */
const ALPHA_FLOOR = 16
/** 키 컬러 판정 — 압축 아티팩트를 감안해 넉넉히. */
const KEY_TOLERANCE = 90
/** 스필(가장자리 마젠타 물듦)을 지울 띠의 폭(px). 키 영역에 닿은 픽셀만 손본다 —
 *  전체에 걸면 포도·자두의 붉은보라까지 초록 쪽으로 밀린다. */
const DESPILL_BAND = 3

const isKey = (d, i) =>
  Math.abs(d[i] - KEY.r) + Math.abs(d[i + 1] - KEY.g) + Math.abs(d[i + 2] - KEY.b) <= KEY_TOLERANCE

/** 테두리에서 이어진 키 컬러 영역만 지운다(flood fill). 피사체 **안쪽**의
 *  붉은보라는 테두리와 이어져 있지 않으므로 살아남는다. */
function removeKeyColour(data, width, height, channels) {
  const keyed = new Uint8Array(width * height)
  const stack = []
  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1)
  }
  while (stack.length) {
    const p = stack.pop()
    if (keyed[p] || !isKey(data, p * channels)) continue
    keyed[p] = 1
    const x = p % width
    const y = (p - x) / width
    if (x > 0) stack.push(p - 1)
    if (x < width - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - width)
    if (y < height - 1) stack.push(p + width)
  }

  let removed = 0
  for (let p = 0; p < width * height; p++) {
    if (keyed[p]) {
      data[p * channels + 3] = 0
      removed++
    }
  }
  if (removed === 0) return

  // 스필 제거 — 지워진 영역에 닿은 띠에서만, 초록을 붉은·파랑의 낮은 쪽까지 끌어올린다.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      if (keyed[p]) continue
      let near = false
      for (let dy = -DESPILL_BAND; dy <= DESPILL_BAND && !near; dy++) {
        for (let dx = -DESPILL_BAND; dx <= DESPILL_BAND; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          if (keyed[ny * width + nx]) {
            near = true
            break
          }
        }
      }
      if (!near) continue
      const i = p * channels
      const floor = Math.min(data[i], data[i + 2])
      if (data[i + 1] < floor) data[i + 1] = floor
    }
  }
}

/** 불투명 영역의 이 비율 미만인 연결요소는 피사체가 아니라 부스러기로 본다.
 *  2회차 앵커에서 실측: 라벨 글자·반짝이는 전부 0.8% 미만이었고 본체는 95% 이상이었다.
 *  정상 구성요소는 자릿수가 다르다 — 복숭아 세 알이면 각 33%, 마늘 쪽 하나도 10%대. */
const FRAGMENT_FLOOR = 0.01

/** 본체(가장 큰 연결요소)에서 떨어져 나온 작은 조각들을 **지우고** 무엇을 얼마나
 *  지웠는지 돌려준다. 지배적인 출처는 생성기 워터마크(Gemini는 우하단에 ✦를 찍는다)라
 *  프롬프트로는 막을 수 없다. 다만 **조용히 지우지는 않는다** — CLI가 매 장의 제거
 *  내역을 찍어, 라벨 글자처럼 프롬프트 위반에서 온 조각(2회차: 합계 2%대)과
 *  워터마크(0.2% 미만)를 사람이 로그에서 구분할 수 있게 한다. */
function dropFragments(data, width, height, channels) {
  const label = new Int32Array(width * height).fill(-1)
  const sizes = []
  for (let p = 0; p < width * height; p++) {
    if (label[p] !== -1 || data[p * channels + 3] === 0) continue
    const id = sizes.length
    let count = 0
    const stack = [p]
    label[p] = id
    while (stack.length) {
      const q = stack.pop()
      count++
      const x = q % width
      const y = (q - x) / width
      if (x > 0 && label[q - 1] === -1 && data[(q - 1) * channels + 3] > 0) { label[q - 1] = id; stack.push(q - 1) }
      if (x < width - 1 && label[q + 1] === -1 && data[(q + 1) * channels + 3] > 0) { label[q + 1] = id; stack.push(q + 1) }
      if (y > 0 && label[q - width] === -1 && data[(q - width) * channels + 3] > 0) { label[q - width] = id; stack.push(q - width) }
      if (y < height - 1 && label[q + width] === -1 && data[(q + width) * channels + 3] > 0) { label[q + width] = id; stack.push(q + width) }
    }
    sizes.push(count)
  }
  const total = sizes.reduce((a, b) => a + b, 0)
  if (total === 0) return { count: 0, share: 0 }

  const doomed = new Set(sizes.map((s, i) => [s, i]).filter(([s]) => s / total < FRAGMENT_FLOOR).map(([, i]) => i))
  if (doomed.size === 0) return { count: 0, share: 0 }

  let removed = 0
  for (let p = 0; p < width * height; p++) {
    if (doomed.has(label[p])) {
      data[p * channels + 3] = 0
      removed++
    }
  }
  return { count: doomed.size, share: (removed / total) * 100 }
}

/** 1024 PNG(투명 배경이거나 평면 마젠타 배경) → 배경 제거 → 알파 정리 →
 *  부스러기 제거 → 피사체 bbox 트림 → 여백 10% 재부여 → 288 WebP.
 *  `{ webp, dropped }`를 돌려준다 — `dropped`는 CLI가 로그로 찍는다.
 *  점유율 80% 통일이 여기서 강제된다(스펙 §7) — AI는 프레이밍을 맞춰주지 않아,
 *  70장을 그대로 쓰면 카드를 스크롤할 때 그림이 커졌다 작아졌다 춤춘다. */
export async function normalizeImage(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  removeKeyColour(data, width, height, channels)

  // 헤일로 정리를 먼저 — 반투명 테두리가 조각으로 세어지면 안 된다.
  for (let p = 0; p < width * height; p++) {
    if (data[p * channels + 3] < ALPHA_FLOOR) data[p * channels + 3] = 0
  }

  // 부스러기 제거는 **bbox보다 먼저**다. 순서가 바뀌면 우하단 워터마크가 bbox를
  // 끌어당겨 피사체가 위로 밀리고 작아진다(2·3회차에서 실측으로 확인).
  const dropped = dropFragments(data, width, height, channels)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] === 0) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  // 모르는 형태를 만나면 조용히 넘기지 않고 실패한다 (KAMIS 어댑터와 같은 결)
  if (maxX < 0) throw new Error('피사체가 없다 — 완전 투명 이미지')
  // 배경이 안 빠졌으면(체커보드·사진 배경·다른 키 컬러) 프레임 전체가 피사체로 잡힌다.
  // 이걸 통과시키면 여백 없는 꽉 찬 사각형이 카드에 박히므로 여기서 멈춘다.
  if (maxX - minX + 1 === width && maxY - minY + 1 === height) {
    throw new Error(
      '배경이 제거되지 않았다 — 프레임 전체가 불투명하다. ' +
        '평면 마젠타(#FF00FF) 배경이나 투명 배경으로 다시 생성해야 한다',
    )
  }

  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const side = Math.max(w, h)
  const canvas = Math.round(side / OCCUPANCY) // 긴 변 80% → 사방 여백 10%
  const left = Math.floor((canvas - w) / 2)
  const top = Math.floor((canvas - h) / 2)

  // 알파를 손본 raw 버퍼로 다시 감싼다 — 헤일로 제거가 출력물에도 반영되어야 한다
  const subject = await sharp(data, { raw: { width, height, channels } })
    .extract({ left: minX, top: minY, width: w, height: h })
    .png()
    .toBuffer()

  // extend와 resize를 한 체인에 두면 안 된다 — sharp는 체인 순서가 아니라 자기
  // 파이프라인 순서로 적용해 resize를 먼저 돌린다(288로 줄인 뒤 여백을 덧대 413×613이
  // 나온다). 여백을 확정한 버퍼를 만들고 나서 별도 인스턴스로 축소한다.
  const padded = await sharp(subject)
    .extend({
      top,
      bottom: canvas - h - top,
      left,
      right: canvas - w - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return { webp: await sharp(padded).resize(SIZE, SIZE).webp().toBuffer(), dropped }
}
