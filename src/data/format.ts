/* ============================================================
   格式化工具 — 金额 / 日期 / 百分比（zh-CN）
   ============================================================ */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const currency = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const currencyInt = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
})

/** ¥1,234.56 */
export function formatAmount(value: number): string {
  return `¥${currency.format(value)}`
}

/** 不带符号千分位：1,234.56 */
export function formatNumber(value: number): string {
  return currency.format(value)
}

/** 整数千分位：1,234 */
export function formatInt(value: number): string {
  return currencyInt.format(value)
}

/** 带方向符号的金额：收入 +¥128.00 / 支出 -¥36.50 */
export function formatSignedAmount(type: 'income' | 'expense', amount: number): string {
  return `${type === 'income' ? '+' : '-'}${formatAmount(amount)}`
}

/** 紧凑金额：¥1.2万 / ¥8,600 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 10000) {
    const v = value / 10000
    return `¥${v.toFixed(v >= 10 ? 1 : 2).replace(/\.?0+$/, '')}万`
  }
  return `¥${formatInt(value)}`
}

export function parseIso(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** '2026-09-29' → '9月29日' */
export function formatShortDate(iso: string): string {
  const d = parseIso(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** '2026-09-29' → '今天' / '昨天' / '9月27日 周日' */
export function formatRelativeDate(iso: string, today = new Date()): string {
  const d = parseIso(iso)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((base.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  const wd = WEEKDAYS[d.getDay()]
  if (d.getFullYear() === today.getFullYear()) return `${formatShortDate(iso)} ${wd}`
  return `${d.getFullYear()}年${formatShortDate(iso)} ${wd}`
}

/** '2026-09' → '2026年9月' */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${y}年${m}月`
}

/** '2026-09' → '9月' */
export function formatMonthShort(month: string): string {
  const [, m] = month.split('-').map(Number)
  return `${m}月`
}

/** 0.42 → '42%'（四舍五入） */
export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

/** 最近 n 个月的月份列表（含当月），倒序或正序 */
export function recentMonths(n: number, today = new Date()): string[] {
  const list: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return list
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
