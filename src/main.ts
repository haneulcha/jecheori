import './style.css'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from './data'
import { seasonalThisMonth, selectPicks } from './picks'
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
    })
  } catch {
    app.innerHTML = '<p class="empty">정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.</p>'
  }
}

start()
