import type { SparkView } from '../card'

const n = (x: number) => x.toLocaleString('ko-KR')

// 픽셀 기하는 여기 산다 — card.ts는 "상대 위치(0~1)"까지만 정한다.
// viewBox를 바꾸려면 이 파일만 바꾸면 된다.
const X = [45, 150, 255]
const Y_FLOOR = 44 // level 0 (최저값)
const Y_RISE = 20 // level 1이면 Y_FLOOR - Y_RISE = 24 (최고값)
const y = (level: number) => Y_FLOOR - level * Y_RISE

export function Sparkline({ spark: s }: { spark: SparkView }) {
  const [yr, mo, now] = s.levels.map((level, i) => ({ x: X[i], y: y(level) }))
  const label = `가격 추이: 작년 이맘때 ${n(s.yearAgo)} · 한 달 전 ${n(s.monthAgo)} · 지금 ${n(s.now)}`
  return (
    <div className="spark num">
      <svg viewBox="0 0 300 72" role="img" aria-label={label}>
        <polyline
          className="trend"
          points={`${yr.x},${yr.y.toFixed(1)} ${mo.x},${mo.y.toFixed(1)} ${now.x},${now.y.toFixed(1)}`}
        />
        <text className="val" x={yr.x} y={(yr.y - 8).toFixed(1)} textAnchor="middle">{n(s.yearAgo)}</text>
        <text className="val" x={mo.x} y={(mo.y - 8).toFixed(1)} textAnchor="middle">{n(s.monthAgo)}</text>
        <text className="val now" x={now.x} y={(now.y - 8).toFixed(1)} textAnchor="middle">{n(s.now)}</text>
        <circle className="pt" cx={yr.x} cy={yr.y.toFixed(1)} r="1.9" />
        <circle className="pt" cx={mo.x} cy={mo.y.toFixed(1)} r="1.9" />
        <circle className="pt now" cx={now.x} cy={now.y.toFixed(1)} r="2.3" />
        <line className="axis" x1="8" y1="54" x2="292" y2="54" />
        <text className="lab" x="45" y="69" textAnchor="middle">작년 이맘때</text>
        <text className="lab" x="150" y="69" textAnchor="middle">한 달 전</text>
        <text className="lab now" x="255" y="69" textAnchor="middle">지금</text>
      </svg>
    </div>
  )
}
