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

/** 키 컬러 픽셀을 지운다 — 테두리에서 이어졌든, 피사체가 에워싼 구멍이든.
 *
 *  처음엔 테두리 flood fill로만 지웠다. 피사체 안쪽의 붉은보라(포도·자두)를 지키려던
 *  건데, 잎·줄기가 고리를 이루면 그 안의 배경이 테두리와 안 이어져 살아남았다
 *  (인쇄 도판 시범본에서 실제로 걸렸다). 갈비뼈 사이·지느러미 틈·마늘 쪽 사이에서
 *  계속 나올 문제다.
 *
 *  전역 제거로 바꿔도 보라는 안전하다. 허용범위는 채널 절대차의 합 90인데,
 *  포도 껍질(60,20,80)은 390, 열무 뿌리의 분홍(255,150,180)도 225로 한참 밖이다.
 *  마젠타 근처에 오는 제철 품목은 없다. */
function removeKeyColour(data, width, height, channels) {
  const keyed = new Uint8Array(width * height)
  let removed = 0
  for (let p = 0; p < width * height; p++) {
    if (!isKey(data, p * channels)) continue
    keyed[p] = 1
    data[p * channels + 3] = 0
    removed++
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

/** 출하되는 288 WebP에서, 불투명 픽셀 중 마젠타 잔류가 이 비율을 넘으면 실패시킨다.
 *
 *  **재는 자리가 288 출력물이라는 게 핵심이다.** 원본(1024/2048)에서 재면 안 된다 —
 *  배경과 피사체 경계, 그리고 잎이 겹치는 안쪽 윤곽·뿌리털 사이에 생성기가 남기는
 *  1픽셀 굵기 마젠타 스필까지 세어, 지표가 생성기 실수가 아니라 **둘레의 복잡도**를
 *  재게 된다. 실측으로 확인: 원본 기준으로는 불량이던 삼겹살 0.21%와 정상인 대파
 *  0.22%가 동률이어서 가르는 임계가 없었다. 대파의 스필은 얇은 선이라 288로 줄이면
 *  이웃과 섞여 사라지고, 삼겹살의 잔류는 덩어리라 축소를 견딘다 — **축소를 견디는지가
 *  진짜 구분선이고, 출하되는 것도 288이다.**
 *
 *  완성 WebP 기준 실측(69장): 67장이 0, `spinach` 0.018%(COLOUR_NOTE가 지정한
 *  "root crown magenta-pink" 자연색), `laver` 0.005%. 불량이던 삼겹살은 0.19%.
 *  0.05%는 그 사이에 양쪽 3배 안팎의 여유를 두고 그은 선이다. */
const RESIDUE_CEILING = 0.0005

/** 마젠타 잔류 비율. 지우지 않고 **센다** — 키 허용범위를 이만큼 넓히면 열무 뿌리의
 *  분홍(합 225)까지 빨아들여 피사체를 갉아먹기 때문에, 제거는 좁게 하고 검출만 넓게
 *  해서 사람에게 알린다. (부스러기 검출은 연결요소 크기만 보고 색은 안 봐서 이걸
 *  놓친다 — 삼겹살이 그랬다.) */
export function magentaResidueShare(data, width, height, channels) {
  let opaque = 0
  let residue = 0
  for (let p = 0; p < width * height; p++) {
    const i = p * channels
    if (data[i + 3] < 128) continue
    opaque++
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // 초록이 크게 죽고, 적·청이 함께 높고 서로 비슷하면 마젠타 계열이다.
    if (r > 150 && b > 150 && g < 90 && Math.abs(r - b) < 70) residue++
  }
  return opaque === 0 ? 0 : residue / opaque
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

  const webp = await sharp(padded).resize(SIZE, SIZE).webp().toBuffer()

  // 배경이 통째로 남은 건 위에서 잡았다. 여기서 잡는 건 **피사체 안에 섞여 남은**
  // 마젠타다 — 생성기가 피사체 위에 배경색을 칠해 놓으면 키잉으로는 안 빠진다.
  // **완성된 WebP를 되읽어서** 잰다 — 근거는 RESIDUE_CEILING 주석 참고.
  const out = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const residue = magentaResidueShare(out.data, out.info.width, out.info.height, out.info.channels)
  if (residue > RESIDUE_CEILING) {
    throw new Error(
      `피사체에 마젠타가 남아 있다 (${(residue * 100).toFixed(2)}%) — ` +
        '생성기가 피사체 위에 배경색을 칠했다. 다시 생성해야 한다',
    )
  }

  return { webp, dropped, residue }
}
