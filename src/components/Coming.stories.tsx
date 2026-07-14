import type { Meta, StoryObj } from '@storybook/react-vite'
import { Coming } from './Coming'
import { buildComingView } from '../app'
import { currentTerm } from '../season'
import { REAL, withRouter } from '../story-utils'

// App 스토리와 같은 이유로 component를 바인딩하지 않는다 (자체 args: month).
const meta: Meta = {
  title: '페이지/Coming',
  decorators: [withRouter], // NavIndex가 <Link>를 쓴다
}

export default meta

/** **월 노브를 돌려보라.** ComingCard는 data-season을 그 품목의 **미래 달** 기준으로 단다 —
 *  8월 품목은 여름 노랑 테이프, 9월 품목은 가을 오렌지 테이프가 한 페이지에 같이 뜬다.
 *  전역 계절 툴바와 무관하게 카드가 자기 색을 정한다 (CONTEXT.md의 ComingCard 항목). */
export const 그달의다가오는제철: StoryObj<{ month: number }> = {
  args: { month: 7 },
  argTypes: { month: { control: { type: 'range', min: 1, max: 12, step: 1 } } },
  render: ({ month }) => (
    <Coming view={buildComingView(REAL.profiles, new Date(2026, month - 1, 15, 9))} />
  ),
}

/** 앞으로 두 달에 새로 드는 품목이 하나도 없으면 문구 한 줄만 남는다.
 *  months: []는 아무 달에서나 나오지 않는다 — 1~12월을 전부 스캔해 확인한 결과
 *  12월만 여기 해당한다(1월 제철 품목이 전부 12월도 제철이라 이미 배정 완료됨).
 *  날짜를 12월로 두고 term도 그 날짜에서 실제로 파생시킨다. */
export const 빈상태: StoryObj = {
  render: () => {
    const date = new Date(2026, 11, 15)
    return <Coming view={{ months: [], date, term: currentTerm(date) }} />
  },
}
