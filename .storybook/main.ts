import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'

/** vite의 plugins는 배열이 중첩될 수 있다 (프리셋이 배열을 돌려준다). */
function flatten(plugins: PluginOption[] | undefined): PluginOption[] {
  return (plugins ?? []).flatMap((p) => (Array.isArray(p) ? flatten(p) : p ? [p] : []))
}

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  viteFinal: (config) => {
    // tanstackStart()는 SSR·프리렌더·라우트 코드젠 플러그인 26개짜리 프리셋이라
    // 클라이언트 전용 Storybook 개발서버와 싸운다. 이름 접두어로 걷어낸다.
    const flat = flatten(config.plugins)
    const kept = flat.filter((p) => !(p && 'name' in p && p.name.startsWith('tanstack')))
    if (kept.length === flat.length) {
      throw new Error(
        'tanstack-* 플러그인을 하나도 걷어내지 못했다. 플러그인 이름 규칙이 바뀌었을 수 있다 — ' +
          `현재 플러그인: ${flat.map((p) => (p && 'name' in p ? p.name : '?')).join(', ')}`,
      )
    }
    config.plugins = kept
    return config
  },
}

export default config
