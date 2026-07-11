import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import appCss from '../style.css?url'
import { seasonOf } from '../season'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '지금 담기 좋은 것' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  const season = seasonOf(new Date().getMonth() + 1)
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body data-season={season}>
        <div id="app">{children}</div>
        <Scripts />
      </body>
    </html>
  )
}
