import type { Decorator, Preview } from '@storybook/react-vite'
import '../src/style.css'

/** 실제 앱은 __root.tsx가 <body data-season>을 달고 #app으로 감싼다. 그대로 흉내낸다 —
 *  #app이 없으면 모바일 28rem 폭이 안 걸려 실물과 다르게 보인다. */
const withAppShell: Decorator = (Story, ctx) => {
  document.body.dataset.season = ctx.globals.season as string
  return (
    <div id="app">
      <Story />
    </div>
  )
}

const preview: Preview = {
  decorators: [withAppShell],
  parameters: { layout: 'fullscreen' },
  initialGlobals: { season: 'summer' },
  globalTypes: {
    season: {
      description: '계절 팔레트 — 실제 앱은 현재 월로 정한다 (season.ts)',
      toolbar: {
        title: '계절',
        icon: 'sun',
        dynamicTitle: true,
        items: [
          { value: 'spring', title: '봄 · 연두' },
          { value: 'summer', title: '여름 · 노랑' },
          { value: 'autumn', title: '가을 · 오렌지' },
          { value: 'winter', title: '겨울 · 자주' },
        ],
      },
    },
  },
}

export default preview
