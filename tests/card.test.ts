import { describe, expect, test } from 'vitest'
import { perUnitPrice, sparklineLevels, whyNowLine, toCardView, toChange, toSpark, toComingCardView, toComingPriceCardView } from '../src/card'
import type { PickResult, PriceView } from '../src/picks'
import type { Baseline, ProduceProfile, PriceEntry } from '../src/types'
import { nutritionView } from '../src/nutrition'
import { recipeView } from '../src/recipe'
import { count, weight } from './units'

const profile: ProduceProfile = {
  id: 'peach',
  name: '복숭아',
  emoji: '🍑',
  category: 'fruit',
  kamis: { categoryCode: '400', itemName: '복숭아', kindName: '백도' },
  seasonMonths: [7, 8],
  peakMonths: [7],
  whyNow: { '7': '칠월 문구', default: '기본' },
  howToPick: '향이 진한 것',
  howToStore: '실온 후숙',
  howToUse: '그냥 먹기',
}

const priceView = (over: Partial<PriceView> = {}): PriceView => ({
  price: 12600,
  unit: count(10),
  changeVsMonthAgoPct: -25.4,
  comparison: { basis: 'weekAgo', basisLabel: '지난 주', pct: -5.97 },
  baseline: { weekAgo: 13400, twoWeeksAgo: null, monthAgo: 16900, yearAgo: 13400, normalYear: null },
  ...over,
})

const pick = (over: Partial<PickResult> = {}): PickResult => ({
  profile,
  inPeak: true,
  price: priceView(),
  ...over,
})

describe('perUnitPrice', () => {
  test('10개면 개당값', () => expect(perUnitPrice(18200, count(10))).toEqual({ each: 1820 }))
  test('반올림', () => expect(perUnitPrice(12600, count(10))).toEqual({ each: 1260 }))
  test('1개(단수)는 null', () => expect(perUnitPrice(21400, count(1))).toBeNull())
  test('무게 단위는 null', () => expect(perUnitPrice(8000, weight(1, 'kg'))).toBeNull())
  test('100g도 null — 무게는 개당값이 없다', () =>
    expect(perUnitPrice(315, weight(100, 'g'))).toBeNull())

  test('포기도 셀 수 있는 단위 — 10포기면 개당값이 나온다', () => {
    // 규칙은 "개인가"가 아니라 "셀 수 있고 수량이 1보다 큰가"다.
    // 예전엔 measure !== '개'로 걸러서 이게 null이었다. KAMIS가 우연히 1포기만
    // 주기 때문에 안 틀렸을 뿐, 규칙 자체가 응답의 우연에 붙어 있었다.
    expect(perUnitPrice(29970, count(10, '포기'))).toEqual({ each: 2997 })
  })

  test('1포기(단수)는 여전히 null', () =>
    expect(perUnitPrice(2997, count(1, '포기'))).toBeNull())

  test('마리(count)는 수량>1이면 마리당값, 근(weight)은 개당값 없음', () => {
    expect(perUnitPrice(9000, { quantity: 3, measure: { kind: 'count', unit: '마리' } })).toEqual({ each: 3000 })
    expect(perUnitPrice(9000, { quantity: 1, measure: { kind: 'weight', unit: '근' } })).toBeNull()
  })
})

describe('sparklineLevels', () => {
  test('최솟값 0, 최댓값 1, 중간은 그 사이', () => {
    // 픽셀이 아니라 상대 위치를 낸다 — viewBox는 컴포넌트 소관
    const lv = sparklineLevels([13400, 16900, 12600])
    expect(lv[1]).toBeCloseTo(1, 5) // 한 달 전이 최고
    expect(lv[2]).toBeCloseTo(0, 5) // 지금이 최저
    expect(lv[0]).toBeGreaterThan(0)
    expect(lv[0]).toBeLessThan(1)
  })

  test('모두 같으면 0.5 (중앙)', () => {
    expect(sparklineLevels([100, 100, 100])).toEqual([0.5, 0.5, 0.5])
  })

  test('픽셀 좌표를 내지 않는다', () => {
    const lv = sparklineLevels([13400, 16900, 12600])
    expect(lv.every((v) => v >= 0 && v <= 1)).toBe(true)
  })

  test('임의 길이 배열도 받는다(최근 4점 궤적용)', () => {
    const lv = sparklineLevels([3698, 3818, 3622, 3513])
    expect(lv).toHaveLength(4)
    expect(lv.every((v) => v >= 0 && v <= 1)).toBe(true)
  })
})

const baseline = (o: Partial<Baseline> = {}): Baseline =>
  ({ weekAgo: null, twoWeeksAgo: null, monthAgo: null, yearAgo: null, normalYear: null, ...o })

describe('toSpark (최근 4점)', () => {
  test('존재하는 최근 점을 시간순 [1달,2주,1주,지금]으로', () => {
    const s = toSpark(3513, baseline({ monthAgo: 3698, twoWeeksAgo: 3818, weekAgo: 3622, normalYear: 4473, yearAgo: 4622 }))!
    // 작년 이맘때가 각주가 아니라 궤적의 첫 점으로 들어온다
    expect(s.points.map((p) => p.label)).toEqual(['작년', '1달 전', '2주 전', '1주 전', '지금'])
    expect(s.points.map((p) => p.value)).toEqual([4622, 3698, 3818, 3622, 3513])
    expect(s.normalYear).toBe(4473)
    expect(s.levels).toHaveLength(5)
  })
  test('결측 점은 건너뛴다', () => {
    const s = toSpark(100, baseline({ monthAgo: 120, weekAgo: 110 }))!
    expect(s.points.map((p) => p.label)).toEqual(['1달 전', '1주 전', '지금'])
  })
  test('점 2개 미만이면 null', () => {
    expect(toSpark(100, baseline())).toBeNull()
  })

  test('평탄 궤적(모든 점이 같음) + 평년 있음 — normalYearLevel이 캔버스 밖으로 안 나간다', () => {
    // KAMIS 주간가가 그대로일 때 흔한 케이스. 점들만으로 스케일을 잡으면 span=0이라
    // normalYear가 (val-min)/1 같은 임의 나눗셈으로 튀어 화면 밖으로 사라졌던 회귀 버그.
    const s = toSpark(3500, baseline({ monthAgo: 3500, twoWeeksAgo: 3500, weekAgo: 3500, normalYear: 4200 }))!
    expect(s.levels.every((lv) => Number.isFinite(lv) && lv >= 0 && lv <= 1)).toBe(true)
    // 평탄한 점들은 스케일 하단(평년이 새 최댓값이 되므로)에 몰린다.
    expect(new Set(s.levels)).toEqual(new Set([0]))
    expect(s.normalYearLevel).not.toBeNull()
    expect(Number.isFinite(s.normalYearLevel)).toBe(true)
    // 평년이 점들보다 위(평상시 케이스)이므로 스케일의 최댓값 — level 1(캔버스 상단)에 놓인다.
    expect(s.normalYearLevel).toBeCloseTo(1, 5)
  })

  test('평년 없으면 normalYearLevel null, 평탄 궤적은 여전히 0.5(중앙)', () => {
    const s = toSpark(3500, baseline({ monthAgo: 3500, twoWeeksAgo: 3500, weekAgo: 3500 }))!
    expect(s.normalYearLevel).toBeNull()
    expect(s.levels).toEqual([0.5, 0.5, 0.5, 0.5])
  })
})

describe('toChange (값어치)', () => {
  test('아래면 fall + basisLabel', () =>
    expect(toChange({ basis: 'weekAgo', basisLabel: '지난 주', pct: -20 }))
      .toEqual({ kind: 'fall', pct: 20, basisLabel: '지난 주' }))
  test('위면 rise', () =>
    expect(toChange({ basis: 'twoWeeksAgo', basisLabel: '2주전', pct: 9 }))
      .toEqual({ kind: 'rise', pct: 9, basisLabel: '2주전' }))
  test('±1% 미만은 similar', () =>
    expect(toChange({ basis: 'monthAgo', basisLabel: '지난달', pct: 0.4 }))
      .toEqual({ kind: 'similar', basisLabel: '지난달' }))
  test('null이면 null', () => expect(toChange(null)).toBeNull())
})

describe('whyNowLine', () => {
  test('해당 월 문구를 쓰고, 없으면 default', () => {
    expect(whyNowLine(profile, 7)).toBe('칠월 문구')
    expect(whyNowLine(profile, 8)).toBe('기본')
  })
})

describe('toCardView', () => {
  test('식별·절정·whyNow·노트를 투영한다', () => {
    const c = toCardView(pick(), 7)
    expect(c.emoji).toBe('🍑')
    expect(c.name).toBe('복숭아')
    expect(c.kind).toBe('백도')
    expect(c.category).toBe('fruit')
    expect(c.inPeak).toBe(true)
    expect(c.whyNow).toBe('칠월 문구')
    expect(c.note).toEqual({ pick: '향이 진한 것', store: '실온 후숙', use: '그냥 먹기' })
  })

  test('kindName 없으면 빈 문자열', () => {
    const p: ProduceProfile = { ...profile, kamis: { categoryCode: '400', itemName: '복숭아' } }
    expect(toCardView(pick({ profile: p }), 7).kind).toBe('')
  })

  test('하락: change fall + 반올림된 pct·basisLabel, 개당값·스파크 계산', () => {
    const c = toCardView(
      pick({ price: priceView({ comparison: { basis: 'weekAgo', basisLabel: '지난 주', pct: -25.4 } }) }),
      7,
    )
    expect(c.price?.change).toEqual({ kind: 'fall', pct: 25, basisLabel: '지난 주' })
    expect(c.price?.now).toBe(12600)
    expect(c.price?.wasMonthAgo).toBe(16900)
    expect(c.price?.perUnit).toBe(1260)
    expect(c.price?.spark).not.toBeNull()
  })

  test('상승: change rise', () => {
    const c = toCardView(
      pick({ price: priceView({ comparison: { basis: 'weekAgo', basisLabel: '지난 주', pct: 13.6 } }) }),
      7,
    )
    expect(c.price?.change).toEqual({ kind: 'rise', pct: 14, basisLabel: '지난 주' })
  })

  test('변동 미미(<1%)는 similar', () => {
    const c = toCardView(
      pick({ price: priceView({ comparison: { basis: 'monthAgo', basisLabel: '지난달', pct: 0.2 } }) }),
      7,
    )
    expect(c.price?.change).toEqual({ kind: 'similar', basisLabel: '지난달' })
  })

  test('비교 기준(comparison) 없으면 change null', () => {
    const c = toCardView(pick({ price: priceView({ comparison: null }) }), 7)
    expect(c.price?.change).toBeNull()
  })

  test('궤적 점이 하나(지금)뿐이면 spark null (change는 comparison 축이라 별개)', () => {
    const c = toCardView(
      pick({
        price: priceView({
          // 작년·1달·2주·1주 모두 없어 지금 한 점뿐 → 그릴 게 없다
          baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: null, yearAgo: null, normalYear: null },
        }),
      }),
      7,
    )
    expect(c.price?.spark).toBeNull()
  })

  test('monthAgoPct는 changeVsMonthAgoPct를 그대로 싣는다(정렬·필터용, change와 별개 축)', () => {
    const c = toCardView(pick({ price: priceView({ changeVsMonthAgoPct: -25 }) }), 7)
    expect(c.price?.monthAgoPct).toBe(-25)
  })

  test('changeVsMonthAgoPct가 null이어도 monthAgoPct는 null로 그대로 싣는다', () => {
    const c = toCardView(pick({ price: priceView({ changeVsMonthAgoPct: null }) }), 7)
    expect(c.price?.monthAgoPct).toBeNull()
  })

  test('작년(yearAgo) 없으면 궤적에서 빠지고 나머지 점으로 그린다', () => {
    const c = toCardView(
      pick({
        price: priceView({
          baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: 16900, yearAgo: null, normalYear: null },
        }),
      }),
      7,
    )
    expect(c.price?.spark).not.toBeNull()
    expect(c.price?.spark?.points.map((p) => p.label)).not.toContain('작년')
  })

  test('무게 단위는 perUnit null', () => {
    const c = toCardView(pick({ price: priceView({ unit: weight(1, 'kg') }) }), 7)
    expect(c.price?.perUnit).toBeNull()
  })

  test('가격 없으면 price null', () => {
    expect(toCardView(pick({ price: null }), 7).price).toBeNull()
  })

  test('nutrition 인자를 CardView에 얹는다', () => {
    const pick = {
      profile: { emoji: '🍎', name: '사과', category: 'fruit', kamis: { itemName: '사과' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '', seasonMonths: [7], peakMonths: [] },
      inPeak: false,
      price: null,
    } as any
    const nv = nutritionView({ foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 })
    expect(toCardView(pick, 7, nv).nutrition).toEqual({ serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 })
  })

  test('nutrition 인자 없으면 null', () => {
    const pick = {
      profile: { emoji: '🥔', name: '감자', category: 'vegetable', kamis: { itemName: '감자' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '', seasonMonths: [7], peakMonths: [] },
      inPeak: false,
      price: null,
    } as any
    expect(toCardView(pick, 7).nutrition).toBeNull()
  })

  test('recipes 인자를 CardView에 얹는다', () => {
    const pick = {
      profile: { emoji: '🍅', name: '토마토', category: 'vegetable', kamis: { itemName: '토마토' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
      inPeak: false,
      price: null,
    } as any
    const rv = recipeView([{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] }])
    expect(toCardView(pick, 7, null, rv).recipes).toEqual([
      { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] },
    ])
  })

  test('recipes 인자 없으면 null', () => {
    const pick = {
      profile: { emoji: '🥔', name: '감자', category: 'vegetable', kamis: { itemName: '감자' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
      inPeak: false,
      price: null,
    } as any
    expect(toCardView(pick, 7).recipes).toBeNull()
  })

  test('season 스트립을 CardView에 얹는다', () => {
    const c = toCardView(pick(), 7)
    expect(c.season.currentMonth).toBe(7)
    expect(c.season.months).toHaveLength(12)
    expect(c.season.months[6]).toEqual({ month: 7, inSeason: true, isPeak: true, isCurrent: true })
    expect(c.season.seasonLabel).toBe('7~8월')
  })
})

const comingProfile: ProduceProfile = {
  id: 'grape', name: '포도', emoji: '🍇', category: 'fruit',
  kamis: { categoryCode: '400', itemName: '포도' },
  seasonMonths: [8, 9], peakMonths: [8],
  whyNow: { '8': '8월이 절정이에요', default: '가을 포도' },
  howToPick: 'p', howToStore: 's', howToUse: 'u',
}
const grapeEntry: PriceEntry = {
  itemName: '포도', kindName: '캠벨', rank: '상품',
  unit: { quantity: 1, measure: { kind: 'count', unit: '개' } },
  price: 3200,
  baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: null, yearAgo: null, normalYear: null },
}

describe('toComingCardView', () => {
  test('가격은 작년 기준 단일값 — 등락·스파크 없음', () => {
    const card = toComingCardView(comingProfile, 8, 7, grapeEntry)
    expect(card.price?.now).toBe(3200)
    expect(card.price?.change).toEqual({ kind: 'basis', basisLabel: '작년' })
    expect(card.price?.monthAgoPct).toBeNull()
    expect(card.price?.spark).toBeNull()
  })

  test('간트 현재월은 오늘 달(7), whyNow는 대상월(8) 기준', () => {
    const card = toComingCardView(comingProfile, 8, 7, grapeEntry)
    expect(card.season.currentMonth).toBe(7)
    expect(card.whyNow).toBe('8월이 절정이에요')
    expect(card.inPeak).toBe(true) // 8월이 절정
  })

  test('가격 엔트리가 없으면 price는 null(무가격 카드)', () => {
    const card = toComingCardView(comingProfile, 8, 7, null)
    expect(card.price).toBeNull()
    expect(card.name).toBe('포도')
  })
})
