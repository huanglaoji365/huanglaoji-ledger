/* ============================================================
   数据结构 — UI 与数据分离
   Transaction / Category / Account / Budget 统一结构
   ============================================================ */

export type TransactionType = 'income' | 'expense'

export type AccountType = 'cash' | 'bank' | 'mobile-pay' | 'credit'

export type BudgetPeriod = 'monthly'

/** 分类颜色：映射到 --chart-color-1 ~ --chart-color-8 */
export type CategoryColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface Category {
  id: string
  name: string
  /** 图标名，对应 AppIcon 组件的 name */
  icon: string
  color: CategoryColor
  type: TransactionType
}

export interface Account {
  id: string
  name: string
  type: AccountType
  /** 当前余额（元），信用卡为负债用负数表示 */
  balance: number
  icon: string
  /** 备注（如卡号尾号） */
  note?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  /** 金额（元），恒为正数，方向由 type 决定 */
  amount: number
  /** 分类 id */
  category: string
  /** 描述（如商家 / 事项） */
  description: string
  /** 账户 id */
  account: string
  /** ISO 日期 YYYY-MM-DD */
  date: string
  tags: string[]
  /** 补充备注 */
  note?: string
}

export interface Budget {
  id: string
  /** 分类 id */
  category: string
  /** 预算金额（元 / 周期） */
  amount: number
  period: BudgetPeriod
}

/** 预算 + 实时进度视图（由 store 计算） */
export interface BudgetProgress extends Budget {
  spent: number
  remaining: number
  /** 0 ~ 1+ */
  ratio: number
  status: 'normal' | 'warning' | 'over'
}

/* ---------------- 便捷视图类型（store 计算产物） ---------------- */

export interface MonthTotal {
  /** YYYY-MM */
  month: string
  income: number
  expense: number
  balance: number
}

export interface CategorySpending {
  category: Category
  amount: number
  /** 占支出总额比例 0~1 */
  ratio: number
  count: number
}

export interface NewTransaction
  extends Omit<Transaction, 'id'> {}
