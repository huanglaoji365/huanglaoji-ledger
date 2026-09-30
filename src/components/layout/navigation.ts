/* ============================================================
   导航模型 — Sidebar / Rail / BottomNav 共享同一份目的地定义
   mobile: 主导航 4 项 + 「更多」聚合次级页面（信息架构重组）
   ============================================================ */

export interface NavItem {
  route: string
  label: string
  icon: string
  /** mobile 底部导航是否可见 */
  primary: boolean
  /** 仅管理员可见 */
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { route: '/', label: '总览', icon: 'home', primary: true },
  { route: '/transactions', label: '交易', icon: 'receipt', primary: true },
  { route: '/analytics', label: '统计', icon: 'chart-pie', primary: true },
  { route: '/budgets', label: '预算', icon: 'wallet', primary: true },
  { route: '/accounts', label: '账户', icon: 'credit-card', primary: false },
  { route: '/categories', label: '分类', icon: 'tag', primary: false },
  { route: '/settings', label: '设置', icon: 'settings', primary: false },
  { route: '/admin', label: '管理后台', icon: 'shield', primary: false, adminOnly: true },
]

export const PAGE_TITLES: Record<string, string> = {
  '/': '总览',
  '/transactions': '交易明细',
  '/analytics': '统计分析',
  '/budgets': '预算管理',
  '/accounts': '账户管理',
  '/categories': '分类管理',
  '/settings': '设置',
  '/profile': '个人信息',
  '/admin': '管理后台',
}

/** 按角色过滤后的导航项 */
export function visibleNavItems(role: string | undefined): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.adminOnly || role === 'admin')
}
