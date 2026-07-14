import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProduceCard } from './ProduceCard'
import { CARD_ARG_TYPES, CARD_KNOBS_DEFAULT, buildCard } from '../story-utils'
import type { CardKnobs } from '../story-utils'

/** 노브는 CardView가 아니라 **원시 재료**다. buildCard가 진짜 picks→card 파이프라인에
 *  통과시키므로, 노브를 돌리면 실제 규칙이 작동한다:
 *  한 달 전 대비를 −0.6%로 만들면 card.ts의 `Math.abs(pct) < 1`이 칩을 지우고 "비슷해요"를 띄운다. */
// `component`은 뺐다 — 메타 Args는 CardKnobs(원시 재료)인데 ProduceCard의 실제 props는
// CardView라 타입이 안 맞는다(render가 buildCard로 그 사이를 잇는다). component 필드는
// Storybook이 props에서 argTypes를 자동생성할 때만 쓰이는데, 여기선 CARD_ARG_TYPES를
// 직접 준다 — 억지로 캐스팅해 넣느니 미사용 필드를 빼는 쪽이 정직하다.
const meta = {
  title: '카드/ProduceCard',
  argTypes: CARD_ARG_TYPES,
  args: CARD_KNOBS_DEFAULT,
  render: (args: CardKnobs) => <ProduceCard card={buildCard(args, 7)} />,
} satisfies Meta<CardKnobs>

export default meta
type Story = StoryObj<CardKnobs>

/** 기본 — 한 달 전보다 15% 내렸다. ↓칩 + 큰 숫자 쪽빛. */
export const 하락: Story = {}

/** 큰 숫자가 러스트로 바뀌고 칩이 ↑가 된다. 오늘 실제 데이터엔 한 건도 없는 상태. */
export const 상승: Story = {
  args: { price: 371, monthAgo: 315 },
}

/** |변화율| < 1%면 card.ts가 칩을 지우고 "한 달 전과 비슷해요"로 바꾼다.
 *  임계를 스토리가 정하지 않는다 — monthAgo를 317↔330으로 옮겨가며 경계를 직접 넘어보라. */
export const 비슷: Story = {
  args: { price: 315, monthAgo: 317 },
}

/** 개당값은 **셀 수 있는 단위이고 수량 > 1**일 때만 성립한다 (card.ts의 perUnitPrice).
 *  unitMeasure를 'g'로 되돌리면 "개당" 각주가 사라지는 걸 확인할 수 있다. */
export const 개당값: Story = {
  args: {
    name: '참외',
    emoji: '🍈',
    kindName: '',
    category: 'fruit',
    price: 7040,
    monthAgo: 8200,
    yearAgo: 6900,
    unitQuantity: 10,
    unitMeasure: '개',
    whyNow: '단맛이 가장 오를 때예요',
  },
}

/** 작년 값이 없으면 스파크라인이 통째로 사라진다 — 세 점 중 하나가 비면 선을 못 그린다.
 *  등락 칩은 한 달 전 값만 있으면 되므로 그대로 남는다. */
export const 스파크없음: Story = {
  args: { yearAgo: null },
}

/** KAMIS 참조가 아예 없는 품목(옥수수·부추·단호박·가지)은 가격 없이 제철 정보만 보여준다.
 *  "아직 못 맞춘 것"과 "원래 가격이 없는 것"은 다르다 (types.ts). */
export const 가격없음: Story = {
  args: {
    name: '옥수수',
    emoji: '🌽',
    kindName: '',
    price: null,
    monthAgo: null,
    yearAgo: null,
    whyNow: '알이 꽉 차고 단맛이 오를 때예요',
  },
}

/** 영양은 프로필 40개 중 3개(복숭아·토마토·사과)에만 있다. 그래서 대부분의 날엔 이 줄이 없다. */
export const 영양있음: Story = {
  args: { hasNutrition: true },
}

/** 레시피 참조가 없으면 카드 펼침에 레시피 진입점이 없다. */
export const 레시피없음: Story = {
  args: { recipeCount: 0 },
}

/** 절정이 아니면 이름 옆 점이 사라진다. 정렬에서도 뒤로 밀린다 (picks.ts). */
export const 절정아님: Story = {
  args: { inPeak: false },
}
