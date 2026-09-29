/* ============================================================
   种子数据 — 确定性伪随机生成，贴近真实中文记账场景
   覆盖最近 6 个月，供图表 / 列表 / 预算演示。
   ============================================================ */

import type { Account, Budget, Category, Transaction } from './types'
import { toIso } from './format'

/** mulberry32：确定性随机数 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const CATEGORIES: Category[] = [
  { id: 'cat-food', name: '餐饮美食', icon: 'utensils', color: 1, type: 'expense' },
  { id: 'cat-transport', name: '交通出行', icon: 'bus', color: 7, type: 'expense' },
  { id: 'cat-shopping', name: '日常购物', icon: 'cart', color: 3, type: 'expense' },
  { id: 'cat-housing', name: '居住水电', icon: 'house', color: 4, type: 'expense' },
  { id: 'cat-fun', name: '文娱游戏', icon: 'gamepad', color: 5, type: 'expense' },
  { id: 'cat-health', name: '医疗健康', icon: 'heart', color: 8, type: 'expense' },
  { id: 'cat-study', name: '学习成长', icon: 'book', color: 2, type: 'expense' },
  { id: 'cat-social', name: '人情往来', icon: 'gift', color: 6, type: 'expense' },
  { id: 'cat-salary', name: '工资收入', icon: 'briefcase', color: 2, type: 'income' },
  { id: 'cat-invest', name: '理财收益', icon: 'trend-up', color: 7, type: 'income' },
  { id: 'cat-redpacket', name: '红包礼金', icon: 'gift', color: 6, type: 'income' },
  { id: 'cat-side', name: '兼职副业', icon: 'sparkles', color: 4, type: 'income' },
]

export const ACCOUNTS: Account[] = [
  { id: 'acc-bank', name: '招商银行卡', type: 'bank', balance: 28560.75, icon: 'bank', note: '储蓄卡 · 6217' },
  { id: 'acc-wechat', name: '微信钱包', type: 'mobile-pay', balance: 1865.4, icon: 'chat', note: '零钱' },
  { id: 'acc-alipay', name: '支付宝', type: 'mobile-pay', balance: 4230.12, icon: 'smartphone', note: '余额宝' },
  { id: 'acc-cash', name: '现金', type: 'cash', balance: 680.0, icon: 'banknote' },
  { id: 'acc-credit', name: '广发信用卡', type: 'credit', balance: -2340.5, icon: 'credit-card', note: '尾号 8321' },
]

export const BUDGETS: Budget[] = [
  { id: 'bud-food', category: 'cat-food', amount: 2000, period: 'monthly' },
  { id: 'bud-transport', category: 'cat-transport', amount: 600, period: 'monthly' },
  { id: 'bud-shopping', category: 'cat-shopping', amount: 1200, period: 'monthly' },
  { id: 'bud-fun', category: 'cat-fun', amount: 500, period: 'monthly' },
  { id: 'bud-housing', category: 'cat-housing', amount: 1800, period: 'monthly' },
]

interface CategoryProfile {
  /** 平均每日出现概率 */
  daily: number
  /** 金额区间 [min, max] */
  range: [number, number]
  /** 描述池 */
  desc: string[]
  /** 账户权重：微信 / 支付宝 / 银行 / 现金 / 信用卡 */
  accounts: [number, number, number, number, number]
  /** 标签池 */
  tags: string[]
}

const EXPENSE_PROFILES: Record<string, CategoryProfile> = {
  'cat-food': {
    daily: 0.85,
    range: [8, 68],
    desc: ['早餐·豆浆油条', '公司楼下快餐', '外卖·黄焖鸡米饭', '瑞幸咖啡', '兰州拉面', '沙县小吃', '奶茶·古茗', '周末火锅', '水果店', '面包甜品'],
    accounts: [5, 3, 0, 1, 1],
    tags: ['早餐', '外卖', '聚餐', '下午茶', '水果'],
  },
  'cat-transport': {
    daily: 0.6,
    range: [2, 42],
    desc: ['地铁通勤', '公交出行', '滴滴打车', '共享单车月卡', '加油', '高速过路费', '停车费'],
    accounts: [4, 4, 1, 0, 1],
    tags: ['通勤', '打车', '自驾'],
  },
  'cat-shopping': {
    daily: 0.32,
    range: [15, 380],
    desc: ['京东超市采购', '淘宝网购', '山姆会员店', '日用品·纸巾洗衣液', '优衣库T恤', '宜家收纳', ' KINDLE电子书', '运动鞋'],
    accounts: [1, 4, 2, 1, 2],
    tags: ['网购', '日用', '服饰', '大促囤货'],
  },
  'cat-housing': {
    daily: 0.03,
    range: [30, 2600],
    desc: ['房租', '电费', '水费', '燃气费', '宽带月费', '物业费'],
    accounts: [0, 1, 4, 0, 0],
    tags: ['水电煤', '房租'],
  },
  'cat-fun': {
    daily: 0.22,
    range: [19, 260],
    desc: ['电影票', '腾讯视频会员', 'Steam游戏', 'KTV', '桌游吧', 'Switch游戏卡带', '网易云音乐会员'],
    accounts: [4, 2, 3, 1, 0],
    tags: ['会员订阅', '游戏', '观影'],
  },
  'cat-health': {
    daily: 0.05,
    range: [15, 480],
    desc: ['药店买药', '门诊挂号', '体检套餐', '健身月卡', '牙科洗牙'],
    accounts: [2, 1, 4, 0, 0],
    tags: ['买药', '运动'],
  },
  'cat-study': {
    daily: 0.06,
    range: [21, 520],
    desc: ['极客时间课程', '纸质书·当当', 'B站大会员', 'Notion模板', '行业报告'],
    accounts: [2, 4, 1, 0, 0],
    tags: ['课程', '书籍', '订阅'],
  },
  'cat-social': {
    daily: 0.08,
    range: [66, 800],
    desc: ['朋友生日礼物', '同事婚礼份子钱', '家人红包', '聚餐AA', '节日礼品'],
    accounts: [3, 3, 2, 1, 1],
    tags: ['礼物', '人情'],
  },
}

const pick = <T,>(rand: () => number, arr: T[]): T => arr[Math.floor(rand() * arr.length)]

const pickWeightedAccount = (rand: () => number, weights: [number, number, number, number, number]): string => {
  const ids = ['acc-wechat', 'acc-alipay', 'acc-bank', 'acc-cash', 'acc-credit']
  const total = weights.reduce((s, w) => s + w, 0)
  let r = rand() * total
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i]
    if (r <= 0) return ids[i]
  }
  return ids[0]
}

const round2 = (n: number) => Math.round(n * 100) / 100

function generateExpenses(rand: () => number, start: Date, end: Date, nextId: () => string): Transaction[] {
  const list: Transaction[] = []
  const day = new Date(start)
  while (day <= end) {
    const iso = toIso(day)
    for (const [catId, profile] of Object.entries(EXPENSE_PROFILES)) {
      // 每天对该分类做 1~2 次概率判定，模拟多笔
      const rolls = profile.daily > 0.5 ? 2 : 1
      for (let i = 0; i < rolls; i++) {
        if (rand() < profile.daily / rolls) {
          const [min, max] = profile.range
          // 幂律偏小额
          const amount = round2(min + (max - min) * Math.pow(rand(), 1.8))
          const useTag = rand() < 0.5
          list.push({
            id: nextId(),
            type: 'expense',
            amount,
            category: catId,
            description: pick(rand, profile.desc),
            account: pickWeightedAccount(rand, profile.accounts),
            date: iso,
            tags: useTag ? [pick(rand, profile.tags)] : [],
          })
        }
      }
    }
    day.setDate(day.getDate() + 1)
  }
  return list
}

function generateIncomes(rand: () => number, start: Date, end: Date, nextId: () => string): Transaction[] {
  const list: Transaction[] = []
  const day = new Date(start)
  while (day <= end) {
    const iso = toIso(day)
    // 工资：每月 10 号
    if (day.getDate() === 10) {
      list.push({
        id: nextId(),
        type: 'income',
        amount: 12800,
        category: 'cat-salary',
        description: '工资到账',
        account: 'acc-bank',
        date: iso,
        tags: ['月薪'],
      })
    }
    // 理财收益：每周一
    if (day.getDay() === 1 && rand() < 0.8) {
      list.push({
        id: nextId(),
        type: 'income',
        amount: round2(8 + rand() * 120),
        category: 'cat-invest',
        description: rand() < 0.5 ? '余额宝收益' : '基金分红',
        account: 'acc-alipay',
        date: iso,
        tags: ['理财'],
      })
    }
    // 偶发红包 / 副业
    if (rand() < 0.05) {
      list.push({
        id: nextId(),
        type: 'income',
        amount: round2(50 + rand() * 600),
        category: rand() < 0.6 ? 'cat-redpacket' : 'cat-side',
        description: rand() < 0.6 ? '家人给的红包' : '设计稿外包尾款',
        account: rand() < 0.7 ? 'acc-wechat' : 'acc-bank',
        date: iso,
        tags: rand() < 0.5 ? ['意外之喜'] : [],
      })
    }
    day.setDate(day.getDate() + 1)
  }
  return list
}

export function buildSeedTransactions(): Transaction[] {
  const rand = mulberry32(20260929)
  let counter = 0
  const nextId = () => `seed-${String(++counter).padStart(4, '0')}`

  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1)
  const all = [
    ...generateIncomes(rand, start, today, nextId),
    ...generateExpenses(rand, start, today, nextId),
  ]
  // 按日期倒序（新的在前），同日按生成序倒序
  all.sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
  return all
}
