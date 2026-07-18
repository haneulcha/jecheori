import type { SparkView } from '../card'

const won = (x: number) => x.toLocaleString('ko-KR')

// 픽셀 기하는 여기 산다 — card.ts는 "상대 위치(0~1)"까지만 정한다.
// viewBox를 바꾸려면 이 파일만 바꾸면 된다. x는 등간격(스케치용 — 정밀 시간축 아님, 점 간격이
// 실제 날짜차를 반영하지 않는다. 작년→1달의 11개월과 1주 간격이 같은 폭이다).
const VW = 300
const VH = 78
const PAD_X = 28
const FLOOR = 50 // level 0 (최저값)
const RISE = 30 // level 1이면 FLOOR - RISE = 20 (최고값)

export function Sparkline({ spark: s }: { spark: SparkView }) {
  const n = s.points.length
  const x = (i: number) => (n === 1 ? VW / 2 : PAD_X + i * ((VW - 2 * PAD_X) / (n - 1)))
  const y = (level: number) => FLOOR - level * RISE

  // normalYearLevel은 card.ts가 points와 같은 스케일(평년 포함 min/max)로 이미 계산해 실어보낸다.
  // 여기서 다시 min/max를 구하면 평탄 궤적(span=0)이나 평년이 범위 밖일 때 어긋난다 — 재계산 금지.
  const pts = s.points.map((p, i) => `${x(i)},${y(s.levels[i]).toFixed(1)}`).join(' ')
  const label = '가격 추이: ' + s.points.map((p) => `${p.label} ${won(p.value)}`).join(' · ')

  return (
    <div className="spark num">
      <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={label}>
        {s.normalYearLevel !== null && (
          <>
            <line
              className="norm-line"
              x1={PAD_X}
              y1={y(s.normalYearLevel).toFixed(1)}
              x2={VW - PAD_X}
              y2={y(s.normalYearLevel).toFixed(1)}
            />
            <text className="norm-lab" x={VW - PAD_X} y={(y(s.normalYearLevel) - 3).toFixed(1)} textAnchor="end">
              평년
            </text>
          </>
        )}
        <polyline className="trend" points={pts} />
        {s.points.map((p, i) => (
          <text
            key={`val-${p.label}`}
            className={`val${i === n - 1 ? ' now' : ''}`}
            x={x(i)}
            y={(y(s.levels[i]) - 6).toFixed(1)}
            textAnchor="middle"
          >
            {won(p.value)}
          </text>
        ))}
        {s.points.map((p, i) => (
          <circle
            key={`pt-${p.label}`}
            className={`pt${i === n - 1 ? ' now' : ''}`}
            cx={x(i)}
            cy={y(s.levels[i]).toFixed(1)}
            r={i === n - 1 ? 2.3 : 1.9}
          />
        ))}
        {s.points.map((p, i) => (
          <text key={`lab-${p.label}`} className={`lab${i === n - 1 ? ' now' : ''}`} x={x(i)} y={VH - 4} textAnchor="middle">
            {p.label}
          </text>
        ))}
      </svg>
      {s.normalYear !== null && (
        <p className="spark-foot">
          <span>
            평년 <b>{won(s.normalYear)}원</b>
          </span>
        </p>
      )}
    </div>
  )
}
