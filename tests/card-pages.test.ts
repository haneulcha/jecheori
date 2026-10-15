import { describe, expect, test } from 'vitest'
import produce from '../public/data/produce.json'
import recipes from '../public/data/recipes.json'

/** 쪽 높이 회귀 게이트.
 *
 *  카드 페이저는 네 쪽이 늘 흐름 안에 있고, 카드 높이는 **가장 긴 쪽**이 정한다
 *  (CSS flex가 알아서 잡는다 — JS 측정 없음). 그래서 어느 쪽이 최장이냐가 곧
 *  "기본 화면에 죽은 공간이 보이나"다:
 *
 *  - 표지가 최장이면 → 표지 여백 0. 기본 상태가 지금 카드와 같다.
 *  - 속쪽이 표지를 넘으면 → 카드가 그만큼 커지고, **모든 카드의 표지 아래가 상시로 빈다.**
 *
 *  쪽 분할(고르는 법 / 보관·쓰임을 가른 것, 레시피 단계를 오버레이에 남긴 것)은 전부
 *  이 부등식을 지키려고 고른 것이다. 문구가 길어지면 조용히 여백이 생기는 대신 여기서
 *  시끄럽게 실패해야 한다 (font-coverage.test.ts와 같은 결).
 *
 *  높이는 렌더 없이 글자 수로 어림한다 — 정확한 픽셀이 아니라 **경향이 뒤집혔는지**를
 *  잡는 게 목적이다. 기준은 데스크탑 다열의 가장 좁은 열(카드 안쪽 196px).
 */

const CHARS_PER_LINE = 13.5 // 196px · text-sm(0.9rem) 한 줄에 들어가는 한글 글자 수
const LINE = 21.6 // line-height 1.5 × 14.4px
const ROW_LABEL = 17 // NoteRow의 라벨 줄
const ROW_GAP = 9.6
const PAGE_HEAD = 57 // 속쪽 머리(40px 도판 + 점선)
const COVER = 346 // 표지: 도판 120 + 이름 + 가격 블록 + 제철 띠 + 한마디
const SPARK_NUT = 293 // 스파크라인 + 영양 6칸 + 기준선

const rows = (...texts: (string | undefined)[]) =>
  texts.reduce<number>(
    (h, t) => h + (t ? ROW_LABEL + Math.ceil(t.length / CHARS_PER_LINE) * LINE + ROW_GAP : 0),
    0,
  )

type Produce = {
  name: string
  howToPick?: string
  howToStore?: string
  howToUse?: string
}
const items = produce as Produce[]

/** 한 품목의 속쪽 높이들. 표지는 내용과 무관하게 고정이라 여기 없다. */
const innerPages = (p: Produce) => ({
  '시세·영양': SPARK_NUT,
  '고르는 법': PAGE_HEAD + rows(p.howToPick),
  // 레시피 진입 칩(약 60px)이 이 쪽 아래에 붙는다
  '보관·쓰임': PAGE_HEAD + rows(p.howToStore, p.howToUse) + 60,
})

describe('카드 쪽 높이', () => {
  test('표지가 가장 긴 쪽으로 남는다 — 어떤 품목도 표지를 넘기지 않는다', () => {
    const over = items
      .flatMap((p) =>
        Object.entries(innerPages(p))
          .filter(([, h]) => h > COVER)
          .map(([label, h]) => `${p.name} / ${label} ${Math.round(h)}px`),
      )
      .sort()
    // 넘치면 그 품목의 카드만 커지는 게 아니라, 그 쪽이 최장이 되어 카드가 통째로 커진다.
    expect(over).toEqual([])
  })

  test('손질을 한 쪽에 몰면 표지를 넘긴다 — 갈라 놓은 이유가 이것이다', () => {
    // 이 테스트는 분할의 근거를 박제한다. 합치자는 제안이 오면 여기서 숫자로 답한다.
    const merged = items.filter(
      (p) => PAGE_HEAD + rows(p.howToPick, p.howToStore, p.howToUse) > COVER,
    )
    expect(merged.length).toBeGreaterThan(items.length / 4)
  })

  test('레시피 조리 단계는 쪽에 안 들어간다 — 카드 위 메모 오버레이로 남긴 이유', () => {
    const { entries } = recipes as { entries: { name: string; steps: string[] }[] }
    const stepsHeight = (steps: string[]) =>
      steps.reduce((h, s) => h + Math.ceil(s.length / 12.5) * LINE + 4.8, 0)
    const tooTall = entries.filter((r) => PAGE_HEAD + 30 + stepsHeight(r.steps) > COVER)
    expect(tooTall.length).toBeGreaterThan(entries.length / 2)
  })
})
