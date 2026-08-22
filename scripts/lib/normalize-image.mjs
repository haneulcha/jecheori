import sharp from 'sharp'

export const SIZE = 288
export const OCCUPANCY = 0.8
/** 이 미만의 알파는 헤일로(생성기가 흔히 남기는 반투명 테두리)로 보고
 *  완전 투명 처리 + bbox 계산에서 제외한다. */
const ALPHA_FLOOR = 16

/** 1024 투명 PNG → 알파 정리 → 피사체 bbox 트림 → 여백 10% 재부여 → 288 WebP.
 *  점유율 80% 통일이 여기서 강제된다(스펙 §7) — AI는 프레이밍을 맞춰주지 않아,
 *  70장을 그대로 쓰면 카드를 스크롤할 때 그림이 커졌다 작아졌다 춤춘다. */
export async function normalizeImage(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = (y * width + x) * channels + 3
      if (data[a] < ALPHA_FLOOR) {
        data[a] = 0
        continue
      }
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  // 모르는 형태를 만나면 조용히 넘기지 않고 실패한다 (KAMIS 어댑터와 같은 결)
  if (maxX < 0) throw new Error('피사체가 없다 — 완전 투명 이미지')

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

  return sharp(padded).resize(SIZE, SIZE).webp().toBuffer()
}
