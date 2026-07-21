// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { Livestock } from './Livestock'
import { renderWithRouter } from '../test-utils'
import type { LivestockView } from '../view-types'
import type { CardView } from '../card'

const card = (name: string): CardView => ({
  emoji: '🥩', name, kind: '', category: 'livestock', inPeak: false,
  whyNow: '설명', note: { pick: 'p', store: 's', use: 'u' },
  price: null, nutrition: null, recipes: null,
  season: { months: [], seasonLabel: '', peakLabel: '', currentMonth: 7 },
})

const view = (cards: CardView[]): LivestockView => ({
  cards, date: new Date('2026-07-21T09:00:00+09:00'), term: undefined,
  freshness: { kind: 'dated', surveyedOn: '2026-07-21', days: 0 },
})

describe('Livestock', () => {
  test('카드 이름을 렌더한다', async () => {
    await renderWithRouter(<Livestock view={view([card('삼겹살'), card('계란')])} />)
    expect(screen.getByText('삼겹살')).toBeTruthy()
    expect(screen.getByText('계란')).toBeTruthy()
  })

  test('빈 목록이면 담백한 안내', async () => {
    await renderWithRouter(<Livestock view={view([])} />)
    expect(screen.getByText(/축산물 값 정보가 아직 없어요/)).toBeTruthy()
  })

  test('제목에 "제철"을 쓰지 않는다', async () => {
    // NavIndex는 페이지 공통 목차라 "지금 제철인 품목" 등 항목 라벨을 늘 포함한다(별도 태스크 소관,
    // 여기서 변경하지 않음). 이 테스트가 지키려는 것은 Livestock 자신의 본문(아이브로·제목·빈 상태 등)에
    // "제철"이 없다는 것이므로 nav 바깥만 검사한다.
    await renderWithRouter(<Livestock view={view([card('삼겹살')])} />)
    expect(screen.queryByText(/제철/, { ignore: 'nav, nav *' })).toBeNull()
  })
})
