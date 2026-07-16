import type { Meta, StoryObj } from '@storybook/react-vite'
import { App } from './App'
import { buildAppView } from '../app'
import { currentTerm, seasonOf } from '../season'
import type { AppView } from '../view-types'
import type { PriceSnapshot } from '../types'
import { CARD_KNOBS_DEFAULT, REAL, buildCard, withRouter } from '../story-utils'

// component를 바인딩하지 않는다 — 스토리마다 커스텀 render와 자체 args(month)를 쓰므로
// Meta<typeof App>로 묶으면 args 타입이 App의 props(view)에 갇힌다.
const meta: Meta = {
  title: '페이지/App',
  decorators: [withRouter], // NavIndex가 <Link>를 쓴다 — 라우터 없으면 크래시
}

export default meta

/** 합성 페이지 뷰 — 페이지 레벨 슬롯(조사일·noDrop·빈상태·푸터)만 골라 보기 위한 것. */
function pageView(over: Partial<AppView>): AppView {
  const date = new Date('2026-07-14T09:00:00+09:00')
  return {
    cards: [buildCard(CARD_KNOBS_DEFAULT, 7)],
    noDrop: false,
    hasNutrition: false,
    hasRecipes: true,
    seasonal: REAL.profiles
      .filter((p) => p.seasonMonths.includes(7))
      .map((p) => ({ emoji: p.emoji, name: p.name })),
    date,
    freshness: { kind: 'dated', surveyedOn: '2026-07-14', days: 0 },
    // term은 지어내지 않는다 — 초복은 24절기가 아니라 season.ts의 currentTerm()이
    // 절대 반환할 수 없는 값이었다. 날짜에서 실제로 파생시킨다.
    term: currentTerm(date),
    ...over,
  }
}

/** 오늘의 모양. 카드 1장으로 줄인 합성 뷰 — 진짜 데이터는 아래 "그달의진짜앱"에서 본다. */
export const 기본: StoryObj = {
  render: () => <App view={pageView({})} />,
}

/** 조사일이 며칠 지난 날. 신선도와 무관하게 "N일 전 · 날짜 기준"이 항상 헤더에 뜬다. */
export const 오래된가격: StoryObj = {
  render: () => (
    <App view={pageView({ freshness: { kind: 'dated', surveyedOn: '2026-07-09', days: 5 } })} />
  ),
}

/** 스냅샷이 아예 없는 날(가격 fetch 실패 등). 조사일 줄이 사라진다 — 날짜를 지어내지 않는다. */
export const 조사일없음: StoryObj = {
  render: () => <App view={pageView({ freshness: { kind: 'none' } })} />,
}

/** 픽은 있는데 하락이 하나도 없는 날. 담백한 안내가 붙는다 — 이커머스 화법 금지.
 *  카드도 하락이 없어야 앞뒤가 맞는다: 한 달 전과 같은 값이면 card.ts가 "비슷해요"를 낸다.
 *  (실제 앱의 noDrop은 app.ts가 `picks.length > 0 && !hasDrops(picks)`로 파생한다.) */
export const 하락없음: StoryObj = {
  render: () => (
    <App
      view={pageView({
        cards: [buildCard({ ...CARD_KNOBS_DEFAULT, monthAgo: CARD_KNOBS_DEFAULT.price }, 7)],
        noDrop: true,
      })}
    />
  ),
}

/** 이번 달 제철 프로필이 아예 없는 달. 카드도 필터도 없이 문구 한 줄. */
export const 빈상태: StoryObj = {
  render: () => <App view={pageView({ cards: [], seasonal: [], hasRecipes: false })} />,
}

/** **가장 은밀한 슬롯.** 영양이 있는 카드가 하나라도 렌더되면 푸터에 출처 줄이 생긴다.
 *  영양은 프로필 40개 중 3개(복숭아·토마토·사과)뿐이고, 그 셋이 top-5에 못 들면
 *  카드의 영양 스탯뿐 아니라 이 푸터 줄까지 통째로 사라진다 (app.ts의 hasNutrition).
 *  그래서 카드 재료를 반드시 그 셋 중 하나(여기선 복숭아)로 써야 한다 — 기본값(감자)엔
 *  foodDb 참조가 없어 hasNutrition 노브를 켜도 매처가 못 찾아 카드도 페이지도 거짓을 그린다. */
export const 영양푸터: StoryObj = {
  render: () => (
    <App
      view={pageView({
        cards: [
          buildCard(
            {
              ...CARD_KNOBS_DEFAULT,
              name: '복숭아',
              emoji: '🍑',
              kindName: '',
              category: 'fruit',
              price: 12000,
              monthAgo: 13500,
              yearAgo: 11000,
              unitQuantity: 1,
              unitMeasure: 'kg',
              whyNow: '7~8월이 노지 복숭아의 절정이에요',
              hasNutrition: true,
            },
            7,
          ),
        ],
        hasNutrition: true,
      })}
    />
  ),
}

/** **진짜 데이터로 그 달의 앱을 본다.** 월 노브를 1~12로 돌려보라 —
 *  1월엔 딸기·감귤·시금치가, 10월엔 사과·단감이 뜬다. "칩은 19개인데 카드는 5개"도 여기서 보인다.
 *
 *  한계 둘:
 *  1. prices.json은 2026-07-13 조사분 한 장뿐이다.
 *     surveyedOn을 시뮬레이션 날짜로 덮으므로 헤더엔 "오늘 · {그 달} 기준"이 뜬다 —
 *     선정·정렬·카드 구성은 전부 진짜지만, **가격 숫자는 7월 실측이라 다른 달에선 참고용이다.**
 *  2. 이 스토리는 계절을 **월 노브에서** 정하므로 상단 계절 툴바가 먹지 않는다.
 *     버그가 아니라 의도다 — 실제 앱도 계절을 고르지 않고 현재 월에서 유도한다. */
export const 그달의진짜앱: StoryObj<{ month: number }> = {
  args: { month: 7 },
  argTypes: { month: { control: { type: 'range', min: 1, max: 12, step: 1 } } },
  render: ({ month }) => {
    const now = new Date(2026, month - 1, 15, 9)
    const iso = `${now.getFullYear()}-${String(month).padStart(2, '0')}-15`
    const snapshot: PriceSnapshot = { ...REAL.prices, surveyedOn: iso }
    const view = buildAppView(REAL.profiles, snapshot, REAL.nutrition, REAL.recipes, now)
    document.body.dataset.season = seasonOf(month) // 그 달의 계절로 팔레트를 맞춘다
    return <App view={view} />
  },
}
