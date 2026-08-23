import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import { KEY, normalizeImage, SIZE } from '../scripts/lib/normalize-image.mjs'

/** 피사체(불투명 사각형)를 치우쳐 놓은 1024 투명 PNG를 합성한다. */
async function syntheticPng({ w = 500, h = 300, left = 37, top = 91, extra = [] } = {}) {
  const subject = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } },
  })
    .png()
    .toBuffer()
  return sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: subject, left, top }, ...extra])
    .png()
    .toBuffer()
}

/** 출력물에서 피사체의 bbox를 잰다.
 *  기준은 알파 50%(=128)다 — `alpha > 0`으로 재면 288로 축소할 때 생기는
 *  가장자리 보간 그라데이션(양쪽 3px 남짓)까지 피사체로 세어 236px처럼 부풀어
 *  읽힌다. 하드 엣지의 실제 윤곽은 알파가 50%를 지나는 지점이다. */
const EDGE = 128

async function bbox(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] >= EDGE) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { w: maxX - minX + 1, h: maxY - minY + 1, minX, minY }
}

describe('normalizeImage — 점유율 80% 정규화 (스펙 §7)', () => {
  test('288×288 WebP(알파)를 낸다', async () => {
    const out = await normalizeImage(await syntheticPng())
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(SIZE)
    expect(meta.height).toBe(SIZE)
    expect(meta.hasAlpha).toBe(true)
  })

  test('피사체 긴 변이 프레임의 ~80%, 중앙 배치 — 원본 위치와 무관', async () => {
    const out = await normalizeImage(await syntheticPng({ left: 37, top: 91 }))
    const b = await bbox(out)
    // 긴 변 500 → 캔버스 625 → 288로 축소하면 500/625*288 ≈ 230px (80%)
    expect(b.w).toBeGreaterThanOrEqual(229)
    expect(b.w).toBeLessThanOrEqual(232)
    // 중앙: 좌우 여백이 같다 (±2px — 리사이즈 보간 오차)
    expect(Math.abs(b.minX - (SIZE - b.w) / 2)).toBeLessThanOrEqual(2)
  })

  test('원본 위치가 달라도 같은 결과를 낸다 — 프레이밍이 정규화된다', async () => {
    const a = await bbox(await normalizeImage(await syntheticPng({ left: 0, top: 0 })))
    const b = await bbox(await normalizeImage(await syntheticPng({ left: 400, top: 600 })))
    expect(Math.abs(a.w - b.w)).toBeLessThanOrEqual(2)
    expect(Math.abs(a.minX - b.minX)).toBeLessThanOrEqual(2)
    expect(Math.abs(a.minY - b.minY)).toBeLessThanOrEqual(2)
  })

  test('알파 헤일로(alpha<16)는 피사체로 치지 않는다 — bbox가 헤일로에 끌려가지 않는다', async () => {
    const halo = await sharp({
      create: { width: 4, height: 4, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.03 } },
    })
      .png()
      .toBuffer()
    const out = await normalizeImage(
      await syntheticPng({ extra: [{ input: halo, left: 1010, top: 1010 }] }),
    )
    const b = await bbox(out)
    expect(b.w).toBeGreaterThanOrEqual(229) // 헤일로가 bbox에 들어갔다면 피사체가 훨씬 작아진다
  })

  test('불투명한 배경(피사체 없음)도 throw — 통짜 사진을 조용히 통과시키지 않는다', async () => {
    const solid = await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 40, g: 90, b: 40, alpha: 1 } },
    })
      .png()
      .toBuffer()
    await expect(normalizeImage(solid)).rejects.toThrow()
  })

  test('완전 투명이면 조용히 넘기지 않고 throw', async () => {
    const empty = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer()
    await expect(normalizeImage(empty)).rejects.toThrow()
  })
})

/** 키 컬러 위에 피사체를 얹은 불투명 PNG를 만든다 (Gemini가 실제로 내주는 형태). */
async function keyedPng({ w = 500, h = 300, left = 37, top = 91, colour = { r: 70, g: 140, b: 60 }, extra = [] } = {}) {
  const subject = await sharp({
    create: { width: w, height: h, channels: 4, background: { ...colour, alpha: 1 } },
  })
    .png()
    .toBuffer()
  return sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { ...KEY, alpha: 1 } },
  })
    .composite([{ input: subject, left, top }, ...extra])
    .png()
    .toBuffer()
}

describe('normalizeImage — 키 컬러 배경 제거 (스펙 §7)', () => {
  test('평면 마젠타 배경을 빼내고 피사체만 남긴다', async () => {
    const out = await normalizeImage(await keyedPng())
    const b = await bbox(out)
    expect(b.w).toBeGreaterThanOrEqual(229)
    expect(b.w).toBeLessThanOrEqual(232)
    // 모서리는 완전 투명이어야 한다
    const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(data[3]).toBe(0)
    expect(data[(info.width - 1) * info.channels + 3]).toBe(0)
  })

  test('피사체 안쪽의 마젠타빛 색은 지우지 않는다 — 테두리에서 이어진 것만 뺀다', async () => {
    // 자두·포도처럼 붉은보라를 가진 품목이 통째로 사라지면 안 된다.
    const plum = await sharp({
      create: { width: 120, height: 120, channels: 4, background: { r: 200, g: 20, b: 190, alpha: 1 } },
    })
      .png()
      .toBuffer()
    const out = await normalizeImage(
      await keyedPng({ extra: [{ input: plum, left: 200, top: 180 }] }),
    )
    const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    // 피사체 사각형 한가운데(자두가 얹힌 자리 근처)는 여전히 불투명
    const cx = Math.floor(info.width / 2)
    const cy = Math.floor(info.height / 2)
    expect(data[(cy * info.width + cx) * info.channels + 3]).toBe(255)
  })

  test('키 컬러 스필(가장자리 마젠타 물듦)을 지운다', async () => {
    // 흰 피사체 — 스필이 남으면 흰 가장자리가 분홍으로 물든다
    const out = await normalizeImage(await keyedPng({ colour: { r: 250, g: 250, b: 250 } }))
    const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let worst = 0
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] < 200) continue // 반투명 가장자리는 합성 시 사라진다
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      worst = Math.max(worst, Math.min(r, b) - g) // 마젠타 물듦 = g가 r·b보다 낮음
    }
    expect(worst).toBeLessThanOrEqual(12)
  })
})
