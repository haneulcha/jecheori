import type { SparkView } from '../card'

const won = (x: number) => x.toLocaleString('ko-KR')

// 픽셀 기하는 여기 산다 — card.ts는 "상대 위치(0~1)"까지만 정한다.
// viewBox를 바꾸려면 이 파일만 바꾸면 된다. x는 등간격(스케치용 — 정밀 시간축 아님, 점 간격이
// 실제 날짜차를 반영하지 않는다).
const VW = 300
const VH = 76
const PAD_X = 24
const FLOOR = 48 // level 0 (최저값)
const RISE = 32 // level 1이면 FLOOR - RISE = 16 (최고값)

export function Sparkline({ spark: s }: { spark: SparkView }) {
  const n = s.points.length
  const x = (i: number) => PAD_X + i * ((VW - 2 * PAD_X) / (n - 1))
  const y = (level: number) => FLOOR - level * RISE

  // 평년을 points와 같은 min/max 스케일로 투영 (levels가 이미 정규화된 것과 동일 기준)
  const vals = s.points.map((p) => p.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const normLevel = s.normalYear !== null ? (s.normalYear - min) / span : null

  const pts = s.points.map((p, i) => `${x(i)},${y(s.levels[i]).toFixed(1)}`).join(' ')
  const label = '가격 추이: ' + s.points.map((p) => `${p.label} ${won(p.value)}`).join(' · ')

  return (
    <div className="spark num">
      <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={label}>
        {normLevel !== null && (
          <>
            <line
              className="norm-line"
              x1={PAD_X}
              y1={y(normLevel).toFixed(1)}
              x2={VW - PAD_X}
              y2={y(normLevel).toFixed(1)}
            />
            <text className="norm-lab" x={VW - PAD_X} y={(y(normLevel) - 3).toFixed(1)} textAnchor="end">
              평년
            </text>
          </>
        )}
        <polyline className="trend" points={pts} />
        {s.points.map((p, i) => (
          <circle
            key={p.label}
            className={`pt${i === n - 1 ? ' now' : ''}`}
            cx={x(i)}
            cy={y(s.levels[i]).toFixed(1)}
            r={i === n - 1 ? 2.3 : 1.9}
          />
        ))}
        {s.points.map((p, i) => (
          <text key={p.label} className={`lab${i === n - 1 ? ' now' : ''}`} x={x(i)} y={VH - 4} textAnchor="middle">
            {p.label}
          </text>
        ))}
      </svg>
      {(s.normalYear !== null || s.yearAgo !== null) && (
        <p className="spark-foot">
          {s.normalYear !== null && (
            <span>
              평년 <b>{won(s.normalYear)}원</b>
            </span>
          )}
          {s.yearAgo !== null && (
            <span>
              작년 이맘때 <b>{won(s.yearAgo)}원</b>
            </span>
          )}
        </p>
      )}
    </div>
  )
}
