import type { Meta, StoryObj } from '@storybook/react-vite'
import { Coming } from './Coming'
import { buildComingView } from '../app'
import { currentTerm } from '../season'
import { REAL, withRouter } from '../story-utils'

const meta: Meta = {
  title: '페이지/Coming',
  decorators: [withRouter], // NavIndex가 <Link>를 쓴다
}

export default meta

/** **월 노브를 돌려보라.** 다가오는 품목이 메인과 같은 풀 카드로 뜬다 — 간트·펼침·손질법·영양·
 *  레시피 동일. 가격은 작년 같은 시기 씨앗(coming-prices.json)이 있으면 "작년 기준 3,200원"으로,
 *  없으면 무가격. 월 섹션 data-season이 테이프 색을 그 달 계절로 정한다(8월 여름·9월 가을). */
export const 그달의다가오는제철: StoryObj<{ month: number }> = {
  args: { month: 7 },
  argTypes: { month: { control: { type: 'range', min: 1, max: 12, step: 1 } } },
  render: ({ month }) => (
    <Coming
      view={buildComingView(
        REAL.profiles,
        REAL.comingPrices,
        REAL.nutrition,
        REAL.recipes,
        new Date(2026, month - 1, 15, 9),
      )}
    />
  ),
}

/** 앞으로 두 달에 새로 드는 품목이 하나도 없으면 문구 한 줄만(12월만 해당). */
export const 빈상태: StoryObj = {
  render: () => {
    const date = new Date(2026, 11, 15)
    return <Coming view={{ months: [], date, term: currentTerm(date) }} />
  },
}
