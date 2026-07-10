import './style.css'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from './data'
import { comingSoon, seasonalThisMonth, selectPicks } from './picks'
import { renderApp } from './render'
import { currentTerm, seasonOf } from './season'

async function start() {
  const app = document.querySelector('#app')!
  const now = new Date()
  document.body.dataset.season = seasonOf(now.getMonth() + 1)
  try {
    const [profiles, snapshot] = await Promise.all([loadProfiles(), loadSnapshot()])
    app.innerHTML = renderApp({
      picks: selectPicks(profiles, snapshot, now),
      seasonal: seasonalThisMonth(profiles, now.getMonth() + 1),
      date: now,
      staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
      term: currentTerm(now),
      coming: comingSoon(profiles, now.getMonth() + 1),
    })
  } catch {
    app.innerHTML = '<p class="empty">정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.</p>'
  }

  // 절정 dot 툴팁: 데스크톱은 CSS hover/focus, 터치는 탭 토글.
  // dot 탭은 카드 펼침(<summary>)을 막고 자기 툴팁만 여닫는다.
  app.addEventListener('click', (e) => {
    const dot = (e.target as HTMLElement).closest('.peak-dot')
    app.querySelectorAll('.peak-dot.show').forEach((d) => {
      if (d !== dot) d.classList.remove('show')
    })
    if (!dot) return
    e.preventDefault() // 카드 펼침 토글 방지
    dot.classList.toggle('show')
  })
}

start()
