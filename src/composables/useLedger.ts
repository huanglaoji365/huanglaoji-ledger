/* ============================================================
   Ledger Store — 全局账本状态（后端版）
   登录后从 /api 拉取数据；增删改先同步服务端再更新本地，
   账户余额以服务端计算为准（交易变动后刷新账户列表）。
   ============================================================ */

import { computed, reactive, readonly } from 'vue'
import { api } from '../api/client'
import { useUi } from './useUi'
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
  /** 首次数据加载完成标记 */
  loaded: boolean
}

const state = reactive<LedgerState>({
  transactions: [],
  categories: [],
  accounts: [],
  budgets: [],
  loaded: false,
})

/* ---------------- 数据加载 ---------------- */

let loadSeq = 0

async function loadAll(): Promise<void> {
  const seq = ++loadSeq
  try {
    const [categories, accounts, budgets, transactions] = await Promise.all([
      api<Category[]>('/categories'),
      api<Account[]>('/accounts'),
      api<Budget[]>('/budgets'),
      api<Transaction[]>('/transactions'),
    ])
    if (seq !== loadSeq) return // 已有更新的加载，丢弃旧结果
    state.categories = categories
    state.accounts = accounts
    state.budgets = budgets
    state.transactions = transactions
    state.loaded = true
  } catch (e) {
    if (seq === loadSeq) useUi().toast(e instanceof Error ? e.message : '数据加载失败')
  }
}

function clear(): void {
  loadSeq++
  state.transactions = []
  state.categories = []
  state.accounts = []
  state.budgets = []
  state.loaded = false
}

async function refreshAccounts(): Promise<void> {
  try {
    state.accounts = await api<Account[]>('/accounts')
  } catch {
    /* 余额刷新失败不打断交互，下次操作会再刷 */
  }
}

function reportError(e: unknown, fallback: string): void {
  useUi().toast(e instanceof Error ? e.message : fallback)
}

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

/* ---------------- 操作（先同步服务端，成功后更新本地） ---------------- */

async function addTransaction(data: NewTransaction): Promise<Transaction | undefined> {
  try {
    const t = await api<Transaction>('/transactions', { method: 'POST', body: data })
    state.transactions.unshift(t)
    void refreshAccounts()
    return t
  } catch (e) {
    reportError(e, '保存失败，请重试')
    return undefined
  }
}

async function deleteTransaction(id: string): Promise<void> {
  try {
    await api(`/transactions/${id}`, { method: 'DELETE' })
    const idx = state.transactions.findIndex((t) => t.id === id)
    if (idx !== -1) state.transactions.splice(idx, 1)
    void refreshAccounts()
  } catch (e) {
    reportError(e, '删除失败，请重试')
  }
}

async function updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<void> {
  try {
    const updated = await api<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: patch })
    const idx = state.transactions.findIndex((t) => t.id === id)
    if (idx !== -1) state.transactions[idx] = updated
    void refreshAccounts()
  } catch (e) {
    reportError(e, '保存失败，请重试')
  }
}

async function addBudget(data: Omit<Budget, 'id'>): Promise<void> {
  if (state.budgets.some((b) => b.category === data.category)) return
  try {
    const b = await api<Budget>('/budgets', { method: 'POST', body: data })
    state.budgets.push(b)
  } catch (e) {
    reportError(e, '保存失败，请重试')
  }
}

async function updateBudget(id: string, patch: Partial<Budget>): Promise<void> {
  try {
    const updated = await api<Budget>(`/budgets/${id}`, { method: 'PATCH', body: patch })
    const idx = state.budgets.findIndex((x) => x.id === id)
    if (idx !== -1) state.budgets[idx] = updated
  } catch (e) {
    reportError(e, '保存失败，请重试')
  }
}

async function deleteBudget(id: string): Promise<void> {
  try {
    await api(`/budgets/${id}`, { method: 'DELETE' })
    const idx = state.budgets.findIndex((b) => b.id === id)
    if (idx !== -1) state.budgets.splice(idx, 1)
  } catch (e) {
    reportError(e, '删除失败，请重试')
  }
}

async function addCategory(data: Omit<Category, 'id'>): Promise<Category | undefined> {
  try {
    const c = await api<Category>('/categories', { method: 'POST', body: data })
    state.categories.push(c)
    return c
  } catch (e) {
    reportError(e, '保存失败，请重试')
    return undefined
  }
}

async function deleteCategory(id: string): Promise<void> {
  try {
    await api(`/categories/${id}`, { method: 'DELETE' })
    state.categories = state.categories.filter((c) => c.id !== id)
    state.budgets = state.budgets.filter((b) => b.category !== id)
  } catch (e) {
    reportError(e, '删除失败，请重试')
  }
}

async function addAccount(data: Omit<Account, 'id'>): Promise<Account | undefined> {
  try {
    const a = await api<Account>('/accounts', { method: 'POST', body: data })
    state.accounts.push(a)
    return a
  } catch (e) {
    reportError(e, '保存失败，请重试')
    return undefined
  }
}

async function updateAccount(id: string, patch: Partial<Account>): Promise<void> {
  try {
    const updated = await api<Account>(`/accounts/${id}`, { method: 'PATCH', body: patch })
    const idx = state.accounts.findIndex((x) => x.id === id)
    if (idx !== -1) state.accounts[idx] = updated
  } catch (e) {
    reportError(e, '保存失败，请重试')
  }
}

async function deleteAccount(id: string): Promise<void> {
  try {
    await api(`/accounts/${id}`, { method: 'DELETE' })
    const idx = state.accounts.findIndex((a) => a.id === id)
    if (idx !== -1) state.accounts.splice(idx, 1)
  } catch (e) {
    reportError(e, '删除失败，请重试')
  }
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
    loadAll,
    clear,
    refreshAccounts,
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
