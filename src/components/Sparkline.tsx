import type { SparkView } from '../card'

const n = (x: number) => x.toLocaleString('ko-KR')

export function Sparkline({ spark: s }: { spark: SparkView }) {
  const [yr, mo, now] = s.points
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
