import './style.css'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from './data'
import { seasonalThisMonth, selectPicks } from './picks'
import { renderApp } from './render'

async function start() {
  const app = document.querySelector('#app')!
  try {
    const [profiles, snapshot] = await Promise.all([loadProfiles(), loadSnapshot()])
    const now = new Date()
    app.innerHTML = renderApp({
      picks: selectPicks(profiles, snapshot, now),
      seasonal: seasonalThisMonth(profiles, now.getMonth() + 1),
      date: now,
      staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
    })
  } catch {
    app.innerHTML = '<p class="empty">정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.</p>'
  }
}

start()
