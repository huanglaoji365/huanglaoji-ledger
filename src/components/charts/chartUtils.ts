/* ============================================================
   图表工具 — 共享类型 / 比例尺 / 平滑曲线 / 圆环扇形路径
   ============================================================ */

export interface CashflowPoint {
  month: string
  income: number
  expense: number
}

export interface DonutItem {
  label: string
  value: number
  color: string
}

export interface BarGroup {
  label: string
  values: number[]
}


export interface Point {
  x: number
  y: number
}

/** 把 0..max 归一到 nice 上限（1/2/2.5/5 ×10^k），返回上限与刻度数组 */
export function niceScale(rawMax: number, tickCount = 4): { max: number; ticks: number[] } {
  if (rawMax <= 0) return { max: 1, ticks: [0, 1] }
  const rough = rawMax / tickCount
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const unit = [1, 2, 2.5, 5, 10].find((u) => u * pow >= rough) ?? 10
  const max = unit * pow * tickCount
  const ticks: number[] = []
  for (let i = 0; i <= tickCount; i++) ticks.push(unit * pow * i)
  return { max, ticks }
}

/** Catmull-Rom → 三次贝塞尔平滑曲线 */
export function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0]!.x},${pts[0]!.y}`
  const d: string[] = [`M${pts[0]!.x},${pts[0]!.y}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`)
  }
  return d.join(' ')
}

/** 圆环扇形（角度制，0 = 12点方向，顺时针） */
export function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const large = endDeg - startDeg > 180 ? 1 : 0
  const x1 = cx + rOuter * Math.cos(rad(startDeg))
  const y1 = cy + rOuter * Math.sin(rad(startDeg))
  const x2 = cx + rOuter * Math.cos(rad(endDeg))
  const y2 = cy + rOuter * Math.sin(rad(endDeg))
  const x3 = cx + rInner * Math.cos(rad(endDeg))
  const y3 = cy + rInner * Math.sin(rad(endDeg))
  const x4 = cx + rInner * Math.cos(rad(startDeg))
  const y4 = cy + rInner * Math.sin(rad(startDeg))
  return [
    `M${x1.toFixed(2)},${y1.toFixed(2)}`,
    `A${rOuter},${rOuter} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
    `L${x3.toFixed(2)},${y3.toFixed(2)}`,
    `A${rInner},${rInner} 0 ${large} 0 ${x4.toFixed(2)},${y4.toFixed(2)}`,
    'Z',
  ].join(' ')
}

let uid = 0
export function chartUid(prefix: string): string {
  return `${prefix}-grad-${++uid}`
}
