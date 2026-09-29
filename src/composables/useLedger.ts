/* ============================================================
   Ledger Store — 全局账本状态（reactive 单例）
   数据（seed）与 UI 完全分离；组件只通过 store 读写数据。
   ============================================================ */

import { computed, reactive, readonly } from 'vue'
import {
  ACCOUNTS,
  BUDGETS,
  buildSeedTransactions,
  CATEGORIES,
} from '../data/seed'
import type {
  Account,
  Budget,
  BudgetProgress,
  Category,
  CategorySpending,
  MonthTotal,
  NewTransaction,
  Transaction,
} from '../data/types'
import { monthOf, recentMonths } from '../data/format'

interface LedgerState {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  budgets: Budget[]
}

const state = reactive<LedgerState>({
  transactions: buildSeedTransactions(),
  categories: [...CATEGORIES],
  accounts: [...ACCOUNTS],
  budgets: [...BUDGETS],
})

/* ---------------- 字典 ---------------- */

const categoryMap = computed(() => {
  const map = new Map<string, Category>()
  state.categories.forEach((c) => map.set(c.id, c))
  return map
})

const accountMap = computed(() => {
  const map = new Map<string, Account>()
  state.accounts.forEach((a) => map.set(a.id, a))
  return map
})

const categoryById = (id: string): Category =>
  categoryMap.value.get(id) ?? {
    id,
    name: '未分类',
    icon: 'help-circle',
    color: 5,
    type: 'expense',
  }

const accountById = (id: string): Account | undefined => accountMap.value.get(id)

/* ---------------- 月份聚合 ---------------- */

const MONTH_COUNT = 6

/** 最近 6 个月（含当月）收支汇总 */
const monthlyTotals = computed<MonthTotal[]>(() => {
  const months = recentMonths(MONTH_COUNT)
  const byMonth = new Map<string, MonthTotal>()
  months.forEach((m) => byMonth.set(m, { month: m, income: 0, expense: 0, balance: 0 }))
  for (const t of state.transactions) {
    const m = monthOf(t.date)
    const bucket = byMonth.get(m)
    if (!bucket) continue
    if (t.type === 'income') bucket.income += t.amount
    else bucket.expense += t.amount
  }
  const list = months.map((m) => {
    const b = byMonth.get(m)!
    return { ...b, balance: b.income - b.expense }
  })
  return list
})

const currentMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

/** 某月的交易列表（倒序） */
function transactionsInMonth(month: string): Transaction[] {
  return state.transactions.filter((t) => monthOf(t.date) === month)
}

/** 某月收支合计 */
function totalsForMonth(month: string): { income: number; expense: number; balance: number } {
  let income = 0
  let expense = 0
  for (const t of transactionsInMonth(month)) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, balance: income - expense }
}

/** 某月分类支出排行（降序） */
function categorySpendingForMonth(month: string): CategorySpending[] {
  const totals = new Map<string, { amount: number; count: number }>()
  let grand = 0
  for (const t of transactionsInMonth(month)) {
    if (t.type !== 'expense') continue
    grand += t.amount
    const prev = totals.get(t.category) ?? { amount: 0, count: 0 }
    totals.set(t.category, { amount: prev.amount + t.amount, count: prev.count + 1 })
  }
  return [...totals.entries()]
    .map(([id, v]) => ({
      category: categoryById(id),
      amount: v.amount,
      count: v.count,
      ratio: grand > 0 ? v.amount / grand : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/** 某分类某月支出 */
function categoryExpenseInMonth(categoryId: string, month: string): number {
  let sum = 0
  for (const t of transactionsInMonth(month)) {
    if (t.type === 'expense' && t.category === categoryId) sum += t.amount
  }
  return sum
}

/** 预算进度（当月） */
const budgetsWithProgress = computed<BudgetProgress[]>(() => {
  const month = currentMonth.value
  return state.budgets
    .map((b) => {
      const spent = categoryExpenseInMonth(b.category, month)
      const ratio = b.amount > 0 ? spent / b.amount : 0
      const status: BudgetProgress['status'] =
        ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'normal'
      return {
        ...b,
        spent,
        remaining: b.amount - spent,
        ratio,
        status,
      }
    })
    .sort((a, b) => b.ratio - a.ratio)
})

/** 最近交易 */
function recentTransactions(limit: number): Transaction[] {
  return state.transactions.slice(0, limit)
}

/* ---------------- 账户 ---------------- */

const netWorth = computed(() => state.accounts.reduce((s, a) => s + a.balance, 0))

/* ---------------- 操作 ---------------- */

let uid = 0
const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++uid}`

function addTransaction(data: NewTransaction): Transaction {
  const t: Transaction = { ...data, id: genId('tx') }
  state.transactions.unshift(t)

  // 账户余额联动：支出扣减、收入增加；信用卡支出增加负债
  const acc = state.accounts.find((a) => a.id === t.account)
  if (acc) {
    acc.balance += t.type === 'income' ? t.amount : -t.amount
  }
  return t
}

function deleteTransaction(id: string): void {
  const idx = state.transactions.findIndex((t) => t.id === id)
  if (idx === -1) return
  const t = state.transactions[idx]
  const acc = state.accounts.find((a) => a.id === t.account)
  if (acc) {
    acc.balance += t.type === 'income' ? -t.amount : t.amount
  }
  state.transactions.splice(idx, 1)
}

function updateTransaction(id: string, patch: Partial<NewTransaction>): void {
  const idx = state.transactions.findIndex((t) => t.id === id)
  if (idx === -1) return
  const old = state.transactions[idx]
  const acc = state.accounts.find((a) => a.id === old.account)
  if (acc) acc.balance += old.type === 'income' ? -old.amount : old.amount
  const next: Transaction = { ...old, ...patch }
  state.transactions[idx] = next
  const acc2 = state.accounts.find((a) => a.id === next.account)
  if (acc2) acc2.balance += next.type === 'income' ? next.amount : -next.amount
}

function addBudget(data: Omit<Budget, 'id'>): void {
  if (state.budgets.some((b) => b.category === data.category)) return
  state.budgets.push({ ...data, id: genId('bud') })
}

function updateBudget(id: string, patch: Partial<Budget>): void {
  const b = state.budgets.find((x) => x.id === id)
  if (b) Object.assign(b, patch)
}

function deleteBudget(id: string): void {
  const idx = state.budgets.findIndex((b) => b.id === id)
  if (idx !== -1) state.budgets.splice(idx, 1)
}

function addCategory(data: Omit<Category, 'id'>): Category {
  const c: Category = { ...data, id: genId('cat') }
  state.categories.push(c)
  return c
}

function deleteCategory(id: string): void {
  const idx = state.categories.findIndex((c) => c.id === id)
  if (idx !== -1) state.categories.splice(idx, 1)
  state.budgets = state.budgets.filter((b) => b.category !== id)
}

function addAccount(data: Omit<Account, 'id'>): Account {
  const a: Account = { ...data, id: genId('acc') }
  state.accounts.push(a)
  return a
}

function updateAccount(id: string, patch: Partial<Account>): void {
  const a = state.accounts.find((x) => x.id === id)
  if (a) Object.assign(a, patch)
}

function deleteAccount(id: string): void {
  const idx = state.accounts.findIndex((a) => a.id === id)
  if (idx !== -1) state.accounts.splice(idx, 1)
}

/** 导出 JSON（设置页） */
function exportJSON(): string {
  return JSON.stringify(
    { transactions: state.transactions, categories: state.categories, accounts: state.accounts, budgets: state.budgets },
    null,
    2,
  )
}

/** 导出 CSV（交易流水） */
function exportCSV(): string {
  const head = ['类型', '金额', '分类', '描述', '账户', '日期', '标签', '备注']
  const rows = state.transactions.map((t) => [
    t.type === 'income' ? '收入' : '支出',
    t.amount.toFixed(2),
    categoryById(t.category).name,
    t.description,
    accountById(t.account)?.name ?? t.account,
    t.date,
    t.tags.join('|'),
    t.note ?? '',
  ])
  return [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function useLedger() {
  return {
    state: readonly(state) as LedgerState,
    categoryMap,
    accountMap,
    categoryById,
    accountById,
    monthlyTotals,
    currentMonth,
    transactionsInMonth,
    totalsForMonth,
    categorySpendingForMonth,
    categoryExpenseInMonth,
    budgetsWithProgress,
    recentTransactions,
    netWorth,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addBudget,
    updateBudget,
    deleteBudget,
    addCategory,
    deleteCategory,
    addAccount,
    updateAccount,
    deleteAccount,
    exportJSON,
    exportCSV,
  }
}
