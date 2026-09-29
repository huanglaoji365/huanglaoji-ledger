<script setup lang="ts">
/**
 * Dashboard 总览 — 页面只做 Layout + 组件组合 + 数据
 */
import { computed } from 'vue'
import { useLedger } from '../composables/useLedger'
import { formatAmount, formatMonthLabel, formatPercent } from '../data/format'
import PageHeader from '../components/layout/PageHeader.vue'
import ExpressiveCard from '../components/ui/ExpressiveCard.vue'
import StatCard from '../components/ui/StatCard.vue'
import ChartCard from '../components/ui/ChartCard.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import CashflowChart from '../components/charts/CashflowChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import type { DonutItem } from '../components/charts/chartUtils'
import BudgetProgress from '../components/finance/BudgetProgress.vue'
import TransactionItem from '../components/finance/TransactionItem.vue'
import CategoryAvatar from '../components/finance/CategoryAvatar.vue'
import type { Category, CategorySpending } from '../data/types'
import { useUi } from '../composables/useUi'
import { openEditFromItem } from '../composables/useEdit'

type LegendEntry =
  | (CategorySpending & { category: Category })
  | { category: null; amount: number; count: number; ratio: number }

const ledger = useLedger()
const ui = useUi()

const month = computed(() => ledger.currentMonth.value)
const totals = computed(() => ledger.totalsForMonth(month.value))
const monthly = computed(() => ledger.monthlyTotals.value)

/** 与上月对比的变化百分比 */
function deltaOf(key: 'income' | 'expense'): number | null {
  const cur = monthly.value[monthly.value.length - 1]
  const prev = monthly.value[monthly.value.length - 2]
  if (!cur || !prev || prev[key] === 0) return null
  return ((cur[key] - prev[key]) / prev[key]) * 100
}

const balanceDelta = computed(() => {
  const cur = monthly.value[monthly.value.length - 1]
  const prev = monthly.value[monthly.value.length - 2]
  if (!cur || !prev || prev.balance === 0) return null
  return ((cur.balance - prev.balance) / Math.abs(prev.balance)) * 100
})

const savingRate = computed(() =>
  totals.value.income > 0 ? totals.value.balance / totals.value.income : 0,
)

const cashflowData = computed(() =>
  monthly.value.map((m) => ({ month: m.month, income: m.income, expense: m.expense })),
)
const balanceSpark = computed(() => monthly.value.map((m) => m.balance))
const incomeSpark = computed(() => monthly.value.map((m) => m.income))

const categoryItems = computed(() => ledger.categorySpendingForMonth(month.value))

const donutItems = computed<DonutItem[]>(() =>
  categoryItems.value.slice(0, 8).map((c) => ({
    label: c.category.name,
    value: c.amount,
    color: `var(--chart-color-${c.category.color})`,
  })),
)

/** 图例：移动端取前 5 + 其他 */
const legendItems = computed<LegendEntry[]>(() => {
  const top = categoryItems.value.slice(0, 5)
  if (categoryItems.value.length <= 5) return top
  const restAmount = categoryItems.value.slice(5).reduce((s, c) => s + c.amount, 0)
  return [
    ...top,
    {
      category: null,
      amount: restAmount,
      count: categoryItems.value.slice(5).reduce((s, c) => s + c.count, 0),
      ratio: totals.value.expense > 0 ? restAmount / totals.value.expense : 0,
    },
  ]
})

const recent = computed(() => ledger.recentTransactions(5))

/** hero 长金额缩字号 */
const heroShrink = computed(() => {
  const len = formatAmount(totals.value.balance).length
  if (len <= 10) return 1
  if (len <= 13) return 0.85
  if (len <= 16) return 0.72
  return 0.6
})

const monthTxCount = computed(() => {
  const list = ledger.transactionsInMonth(month.value)
  return {
    total: list.length,
    income: list.filter((t) => t.type === 'income').length,
    expense: list.filter((t) => t.type === 'expense').length,
  }
})
</script>

<template>
  <div class="dashboard page">
    <PageHeader
      title="总览"
      :description="`${formatMonthLabel(month)} · 净收入 ${formatAmount(Math.max(0, totals.balance))}`"
    />

    <!-- 核心指标 -->
    <section class="stats" aria-label="本月收支概况">
      <ExpressiveCard tone="primary" class="hero">
        <div class="hero-top">
          <span class="hero-label">本月结余</span>
          <span v-if="balanceDelta != null" class="hero-delta" :class="balanceDelta >= 0 ? 'up' : 'down'">
            <AppIcon :name="balanceDelta >= 0 ? 'arrow-up-right' : 'arrow-down-right'" :size="14" />
            较上月 {{ Math.abs(balanceDelta).toFixed(1) }}%
          </span>
        </div>
        <p
          class="hero-value numeric"
          :style="{ '--vshrink': heroShrink }"
          :aria-label="`本月结余 ${formatAmount(totals.balance)}`"
          :title="formatAmount(totals.balance)"
        >
          {{ formatAmount(totals.balance) }}
        </p>
        <p class="hero-sub">
          收入 {{ formatAmount(totals.income) }} · 支出 {{ formatAmount(totals.expense) }}
        </p>
      </ExpressiveCard>

      <StatCard label="本月收入" :value="formatAmount(totals.income)" :delta="deltaOf('income')" tone="income">
        <template #default><div class="spark" /></template>
      </StatCard>
      <StatCard label="本月支出" :value="formatAmount(totals.expense)" :delta="deltaOf('expense')" tone="expense" />
      <StatCard
        label="储蓄率"
        :value="formatPercent(savingRate, 1)"
        :sub="`存下 ${formatAmount(Math.max(0, totals.balance))}`"
      />
      <StatCard
        label="本月笔数"
        :value="`${monthTxCount.total} 笔`"
        :sub="`收入 ${monthTxCount.income} · 支出 ${monthTxCount.expense}`"
      />
    </section>

    <!-- 收支趋势 -->
    <ChartCard title="收支趋势" subtitle="最近 6 个月">
      <CashflowChart :data="cashflowData" :height="280" />
    </ChartCard>

    <!-- 支出构成 + 预算 -->
    <section class="two-col">
      <ChartCard title="支出构成" :subtitle="`${formatMonthLabel(month)}`">
        <div class="donut-layout">
          <DonutChart :items="donutItems" center-label="总支出" :size="216" />
          <ul class="cat-legend">
            <li v-for="(c, i) in legendItems" :key="i" class="cat-row">
              <template v-if="c.category">
                <CategoryAvatar :category="c.category" size="sm" />
                <span class="cat-name">{{ c.category.name }}</span>
              </template>
              <template v-else>
                <span class="cat-more" aria-hidden="true"><AppIcon name="grid" :size="14" /></span>
                <span class="cat-name">其他</span>
              </template>
              <span class="cat-bar" aria-hidden="true">
                <i :style="{ width: `${Math.min(100, c.ratio * 100)}%`, background: c.category ? `var(--chart-color-${c.category.color})` : 'var(--color-outline)' }" />
              </span>
              <span class="cat-pct numeric">{{ formatPercent(c.ratio) }}</span>
            </li>
          </ul>
        </div>
      </ChartCard>

      <ChartCard
        title="预算执行"
        :subtitle="`${ledger.budgetsWithProgress.value.filter((b) => b.status !== 'over').length}/${ledger.budgetsWithProgress.value.length} 项正常`"
      >
        <ul class="budget-list">
          <li v-for="b in ledger.budgetsWithProgress.value.slice(0, 3)" :key="b.id">
            <BudgetProgress :budget="b" />
          </li>
        </ul>
        <template #footer>
          <AppButton variant="text" trailing-icon="arrow-right" @click="$router.push('/budgets')">
            管理全部预算
          </AppButton>
        </template>
      </ChartCard>
    </section>

    <!-- 最近交易 -->
    <AppCard padding="none" class="recent-card">
      <header class="recent-head">
        <h2 class="section-title">最近交易</h2>
        <AppButton variant="text" trailing-icon="arrow-right" @click="$router.push('/transactions')">
          查看全部
        </AppButton>
      </header>
      <ul class="recent-list">
        <li v-for="t in recent" :key="t.id">
          <TransactionItem :transaction="t" show-date @click="openEditFromItem(t)" />
        </li>
      </ul>
      <div v-if="!recent.length" class="recent-empty">
        <p>还没有交易记录</p>
        <AppButton variant="tonal" icon="plus" @click="ui.openAddSheet()">记一笔</AppButton>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.hero {
  grid-column: 1 / -1;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.hero-label {
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  opacity: 0.85;
}
.hero-delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font: var(--type-label-small-size) / 1.5 var(--font-sans);
  font-weight: 550;
}
.hero-delta.up {
  background: color-mix(in srgb, var(--color-income) 18%, transparent);
  color: var(--color-income);
}
.hero-delta.down {
  background: color-mix(in srgb, var(--color-expense) 14%, transparent);
  color: var(--color-expense);
}

.hero-value {
  margin-top: var(--space-2);
  font-size: calc(clamp(34px, 9cqi, 44px) * var(--vshrink, 1));
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: -0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero-sub {
  margin-top: var(--space-1);
  font: var(--type-body-medium-size) / 1.5 var(--font-sans);
  opacity: 0.75;
}

.spark {
  height: 4px;
}

.two-col {
  display: grid;
  gap: var(--space-4);
}

.donut-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  min-width: 0;
}

.cat-legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
}
.cat-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'avatar name pct';
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.cat-row > :nth-child(1) { grid-area: avatar; }
.cat-name {
  grid-area: name;
  font: var(--type-body-medium-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-more {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
}
.cat-bar {
  display: none;
}
.cat-pct {
  grid-area: pct;
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  font-weight: 550;
  color: var(--color-on-surface-variant);
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.recent-card {
  overflow: hidden;
}
.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-2);
}
.section-title {
  font: var(--type-title-medium-size) / 1.4 var(--font-sans);
  font-weight: var(--type-title-medium-weight);
}
.recent-list li + li {
  border-top: 1px solid var(--color-outline-variant);
}
.recent-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) 0 var(--space-10);
  color: var(--color-on-surface-variant);
}

@media (min-width: 600px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .page {
    gap: var(--space-8);
  }
  .stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: minmax(148px, auto);
    gap: var(--space-4);
  }
  .hero {
    grid-column: span 2;
    grid-row: span 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .two-col {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }
  .donut-layout {
    flex-direction: row;
    justify-content: center;
  }
  .donut-layout > :first-child {
    flex-shrink: 0;
  }
  .cat-legend {
    flex: 1;
    max-width: 320px;
  }
  .cat-row {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'avatar name'
      'avatar bar'
      'avatar pct';
    grid-template-rows: auto 4px auto;
    row-gap: var(--space-1);
  }
  .cat-bar {
    display: block;
    grid-area: bar;
    height: 4px;
    border-radius: var(--radius-full);
    background: var(--color-surface-container-highest);
    overflow: hidden;
  }
  .cat-bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
  }
}
</style>
