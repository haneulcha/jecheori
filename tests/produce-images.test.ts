import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import type { ProduceProfile } from '../src/types'

const profiles: ProduceProfile[] = JSON.parse(
  readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
)
const dir = fileURLToPath(new URL('../public/assets/produce/', import.meta.url))
const referenced = [...new Set(profiles.flatMap((p) => (p.image ? [p.image] : [])))]
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.webp')) : []

/** 선례: tests/font-coverage.test.ts — 조용한 폴백 대신 시끄러운 실패.
 *
 *  `image` 오타는 다른 어떤 게이트에도 안 걸린다: 옵셔널 필드라 tsc가 조용하고,
 *  이모지 폴백이 있어 화면도 안 깨진다. 96px 자리에 깨진 이미지 아이콘 하나가
 *  조용히 배포될 뿐이다. 여기서만 잡힌다. */
describe('품목 도판 ↔ produce.json 동기화', () => {
  test('produce.json이 가리키는 도판 파일이 전부 실제로 있다', () => {
    const missing = referenced.filter((image) => !existsSync(join(dir, `${image}.webp`)))
    expect(missing).toEqual([])
  })

  /** 재생성 시 파일명을 바꾸는 게 캐시 정책이다(peach → peach-2, 스펙 §7).
   *  옛 파일을 안 지우면 배포 용량만 먹는 고아가 쌓인다. */
  test('참조 없는 고아 파일이 없다', () => {
    const need = new Set(referenced)
    const orphans = files.filter((f) => !need.has(f.replace(/\.webp$/, '')))
    expect(orphans).toEqual([])
  })

  /** 부록 B의 공유 매핑이 실제로 공유로 구현됐는지 — 한우 등급 3항목이 부위 1장을
   *  쓰는 게 "등급은 그림으로 안 가른다"(스펙 §12) 결정의 코드상 표현이다. */
  test('한우 등급 3항목이 같은 도판을 가리킨다', () => {
    const grades = profiles.filter((p) => p.id.startsWith('hanwoo-sirloin-'))
    expect(grades).toHaveLength(3)
    expect([...new Set(grades.map((p) => p.image))]).toEqual(['hanwoo-sirloin'])
  })
})
