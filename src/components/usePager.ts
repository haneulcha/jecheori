import { useCallback, useEffect, useRef, useState } from 'react'

/** 카드 내 쪽 넘김 — Pointer Events + 스프링. 표시 로직은 없다(위치만 만든다).
 *  스펙: docs/superpowers/specs/2026-09-06-card-paging-design.md
 *
 *  라이브러리를 쓰지 않는다. 앱의 경량·무추적 원칙도 있지만, 실제로 필요한 게
 *  스프링 하나와 투영 한 줄이라 60줄로 끝난다(시안에서 확인).
 */

// ζ≈0.87, response≈0.35s. 던진 뒤 살짝만 안착하고 오버슈트는 눈에 안 띈다.
const STIFFNESS = 300
const DAMPING = 30
/** Apple의 모멘텀 투영(감속 0.998) — 물리 교과서의 v²/2a가 아니라 지수감쇠 형태다. */
const project = (velocity: number) => (velocity / 1000) * 0.998 / (1 - 0.998)
/** 방향이 정해지기 전 흔들림을 삼키는 문턱. */
const HYSTERESIS = 10

const prefersReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function usePager(count: number) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  // 표시용 쪽 번호(0..count-1). 트랙이 실제로 서 있는 자리는 v(가상 인덱스)다.
  const [page, setPage] = useState(0)
  // 가상 인덱스는 …−1, 0, 1, 2… 로 무한히 흐른다. 감싸기는 쪽의 transform이 맡는다.
  const v = useRef(0)
  const x = useRef(0)
  const vel = useRef(0)
  const target = useRef(0)
  const raf = useRef<number | null>(null)
  const last = useRef(0)

  const width = () => viewportRef.current?.clientWidth ?? 0

  /** 무한 루프 — 클론 대신 각 쪽을 translateX(k·N·W)로 현재 위치 근처에 데려다 놓는다.
   *  0쪽에서 왼쪽으로 당기면 마지막 쪽이 실제로 왼편에 서 있어 손가락을 따라 이어진다. */
  const place = useCallback(
    (px: number) => {
      const track = trackRef.current
      const w = width()
      if (!track || !w) return
      const at = -px / w
      for (let i = 0; i < track.children.length; i++) {
        const el = track.children[i] as HTMLElement
        const k = Math.round((at - i) / count)
        // k가 바뀔 때만 쓴다 — 매 프레임 N번 쓰면 레이아웃이 헛돈다.
        if (el.dataset.k !== String(k)) {
          el.dataset.k = String(k)
          el.style.transform = `translateX(${k * count * w}px)`
        }
      }
    },
    [count],
  )

  const paint = useCallback(
    (px: number) => {
      x.current = px
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${px}px,0,0)`
      place(px)
    },
    [place],
  )

  /** 날던 애니메이션을 그 자리에서 붙잡는다 — 다음 동작은 현재(presentation) 값에서 이어진다. */
  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current)
    raf.current = null
  }, [])

  const tick = useRef<(now: number) => void>(() => {})
  tick.current = (now) => {
    const dt = Math.min((now - last.current) / 1000, 1 / 30)
    last.current = now
    vel.current += (-STIFFNESS * (x.current - target.current) - DAMPING * vel.current) * dt
    const next = x.current + vel.current * dt
    if (Math.abs(next - target.current) < 0.2 && Math.abs(vel.current) < 0.2) {
      vel.current = 0
      raf.current = null
      paint(target.current)
      return
    }
    paint(next)
    raf.current = requestAnimationFrame((t) => tick.current(t))
  }

  /** 가상 인덱스로 이동. v0을 주면 제스처 속도를 그대로 이어받는다. */
  const settle = useCallback(
    (next: number, v0 = 0) => {
      v.current = next
      setPage(((next % count) + count) % count)
      target.current = -next * width()
      stop()
      if (prefersReduced() || width() === 0) {
        paint(target.current)
        return
      }
      vel.current = v0
      last.current = performance.now()
      raf.current = requestAnimationFrame((t) => tick.current(t))
    },
    [count, paint, stop],
  )

  /** 도트·키보드용. 루프에서 가장 가까운 방향으로 돈다. */
  const goTo = useCallback(
    (to: number) => {
      const cur = ((v.current % count) + count) % count
      let d = (to - cur + count) % count
      if (d > count / 2) d -= count
      settle(v.current + d)
    },
    [count, settle],
  )
  const step = useCallback((d: number) => settle(v.current + d), [settle])

  // ── 제스처 ────────────────────────────────────────────────────────────
  const drag = useRef({ id: null as number | null, x0: 0, y0: 0, base: 0, from: 0, axis: '' as '' | 'x' | 'y' })
  const hist = useRef<[number, number][]>([])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 칩·버튼은 제스처가 아니다
    if ((e.target as HTMLElement).closest('button')) return
    const d = drag.current
    d.id = e.pointerId
    d.x0 = e.clientX
    d.y0 = e.clientY
    d.base = x.current
    d.from = v.current
    d.axis = ''
    hist.current = [[e.clientX, performance.now()]]
    stop()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (e.pointerId !== d.id) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.axis) {
      if (Math.abs(dx) < HYSTERESIS && Math.abs(dy) < HYSTERESIS) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      // 세로면 제스처를 포기하고 페이지 스크롤에 양보한다(touch-action: pan-y와 한 쌍)
      if (d.axis === 'y') {
        d.id = null
        return
      }
      // 포인터가 카드를 벗어나도 계속 따라온다
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    hist.current.push([e.clientX, performance.now()])
    if (hist.current.length > 6) hist.current.shift()
    // 경계가 없으니(무한 루프) 러버밴딩도 없다 — 그대로 1:1
    paint(d.base + dx)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (e.pointerId !== d.id) return
    d.id = null
    if (d.axis !== 'x') return
    const h = hist.current
    const [px, pt] = h[0]
    const [cx, ct] = h[h.length - 1]
    const velocity = ct > pt ? ((cx - px) / (ct - pt)) * 1000 : 0
    const w = width()
    const landing = w ? Math.round(-(x.current + project(velocity)) / w) : d.from
    // 한 제스처는 한 쪽만 — 세게 던지면 투영이 여러 쪽을 건너뛰어 4쪽 루프에서 방향을 잃는다
    settle(Math.max(d.from - 1, Math.min(d.from + 1, landing)), velocity)
  }

  // 폭이 바뀌면 자리를 다시 잡는다. k 캐시도 비워야 새 폭으로 다시 계산된다.
  const relayout = useCallback(() => {
    const track = trackRef.current
    if (track) {
      for (let i = 0; i < track.children.length; i++) {
        delete (track.children[i] as HTMLElement).dataset.k
      }
    }
    paint(-v.current * width())
  }, [paint])

  useEffect(() => {
    relayout()
    addEventListener('resize', relayout)
    return () => {
      removeEventListener('resize', relayout)
      stop()
    }
  }, [relayout, stop])

  return {
    page,
    goTo,
    step,
    viewportRef,
    trackRef,
    viewportProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}

/** 하이드레이션 전에는 false. 무JS·프리렌더 산출물이 <details> 폴백으로 남게 한다.
 *  App.tsx의 `ready`와 같은 패턴 — 서버 렌더와 첫 클라 렌더가 일치해야 하이드레이션이 안 깨진다. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
