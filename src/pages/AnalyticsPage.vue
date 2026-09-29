<script setup lang="ts">
/**
 * Analytics 统计分析 — 月度对比 / 支出构成 / 收入来源
 */
import { computed, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useBreakpoints } from '../composables/useBreakpoint'
import { formatAmount, formatCompact, formatMonthLabel, formatPercent, daysInMonth, formatMonthShort } from '../data/format'
import PageHeader from '../components/layout/PageHeader.vue'
import ChartCard from '../components/ui/ChartCard.vue'
import StatCard from '../components/ui/StatCard.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import BarChart from '../components/charts/BarChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import type { DonutItem } from '../components/charts/chartUtils'
import CategoryAvatar from '../components/finance/CategoryAvatar.vue'
import AppIcon from '../components/ui/AppIcon.vue'

const ledger = useLedger()
const { large } = useBreakpoints()

const selectedMonth = ref(ledger.currentMonth.value)

const monthOptions = computed(() =>
  ledger.monthlyTotals.value
    .slice()
    .reverse()
    .map((m) => ({ value: m.month, label: formatMonthLabel(m.month) })),
)

const totals = computed(() => ledger.totalsForMonth(selectedMonth.value))
const prevTotals = computed(() => {
  const idx = ledger.monthlyTotals.value.findIndex((m) => m.month === selectedMonth.value)
  const prev = ledger.monthlyTotals.value[idx - 1]
  return prev ?? { income: 0, expense: 0, balance: 0 }
})

const expenseDelta = computed(() =>
  prevTotals.value.expense > 0
    ? ((totals.value.expense - prevTotals.value.expense) / prevTotals.value.expense) * 100
    : null,
)

const monthTx = computed(() => ledger.transactionsInMonth(selectedMonth.value))
const expenseTx = computed(() => monthTx.value.filter((t) => t.type === 'expense'))

const avgPerTx = computed(() =>
  expenseTx.value.length ? totals.value.expense / expenseTx.value.length : 0,
)
const daysElapsed = computed(() => {
  const now = new Date()
  const isCurrent = selectedMonth.value === ledger.currentMonth.value
  return isCurrent ? now.getDate() : daysInMonth(selectedMonth.value)
})
const avgPerDay = computed(() => totals.value.expense / Math.max(1, daysElapsed.value))
const maxTx = computed(() =>
  expenseTx.value.slice().sort((a, b) => b.amount - a.amount)[0],
)

const barGroups = computed(() =>
  ledger.monthlyTotals.value.map((m) => ({
    label: formatMonthShort(m.month),
    values: [m.income, m.expense],
  })),
)

const categoryItems = computed(() => ledger.categorySpendingForMonth(selectedMonth.value))

const donutItems = computed<DonutItem[]>(() =>
  categoryItems.value.slice(0, 8).map((c) => ({
    label: c.category.name,
    value: c.amount,
    color: `var(--chart-color-${c.category.color})`,
  })),
)

const ranked = computed(() => categoryItems.value)

const incomeItems = computed(() => {
  const map = new Map<string, number>()
  for (const t of monthTx.value) {
    if (t.type !== 'income') continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  }
  return [...map.entries()]
    .map(([id, amount]) => ({ category: ledger.categoryById(id), amount }))
    .sort((a, b) => b.amount - a.amount)
})
const incomeTotal = computed(() => incomeItems.value.reduce((s, i) => s + i.amount, 0))
</script>

<template>
  <div class="analytics page">
    <PageHeader title="统计分析" description="看清钱的去向与来源">
      <template #actions>
        <div class="month-pick">
          <AppSelect v-model="selectedMonth" :options="monthOptions" label="统计月份" />
        </div>
      </template>
    </PageHeader>

    <!-- 关键指标 -->
    <section class="stats" aria-label="本月支出指标">
      <StatCard
        label="本月支出"
        :value="formatAmount(totals.expense)"
        :delta="expenseDelta"
        :delta-label="expenseDelta != null ? '较上月' : ''"
        tone="expense"
      />
      <StatCard label="单笔均值" :value="formatAmount(avgPerTx)" :sub="`共 ${expenseTx.length} 笔支出`" />
      <StatCard label="日均支出" :value="formatAmount(avgPerDay)" :sub="`按 ${daysElapsed} 天计`" />
      <StatCard
        v-if="maxTx"
        label="最大单笔"
        :value="formatAmount(maxTx.amount)"
        :sub="`${maxTx.description} · ${ledger.categoryById(maxTx.category).name}`"
      />
    </section>

    <!-- 月度趋势 -->
    <ChartCard title="月度收支对比" subtitle="最近 6 个月">
      <BarChart :groups="barGroups" :height="large ? 280 : 240" />
    </ChartCard>

    <div class="two-col">
      <!-- 支出构成 -->
      <ChartCard title="支出构成" :subtitle="formatMonthLabel(selectedMonth)">
        <div class="donut-layout">
          <DonutChart :items="donutItems" center-label="总支出" :size="216" />
          <ol class="ranked">
            <li v-for="(c, i) in ranked" :key="c.category.id" class="rank-row">
              <span class="rank-num numeric">{{ i + 1 }}</span>
              <CategoryAvatar :category="c.category" size="sm" />
              <div class="rank-info">
                <div class="rank-line">
                  <span class="rank-name">{{ c.category.name }}</span>
                  <span class="rank-amount numeric">{{ formatAmount(c.amount) }}</span>
                </div>
                <div class="rank-bar" aria-hidden="true">
                  <i
                    :style="{
                      width: `${Math.max(2, c.ratio * 100)}%`,
                      background: `var(--chart-color-${c.category.color})`,
                    }"
                  />
                </div>
                <div class="rank-meta">
                  <span>{{ c.count }} 笔</span>
                  <span class="numeric">{{ formatPercent(c.ratio, 1) }}</span>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </ChartCard>

      <!-- 收入来源 -->
      <ChartCard title="收入来源" :subtitle="`${formatMonthLabel(selectedMonth)} · 合计 ${formatCompact(incomeTotal)}`">
        <ul v-if="incomeItems.length" class="income-list">
          <li v-for="i in incomeItems" :key="i.category.id" class="income-row">
            <CategoryAvatar :category="i.category" size="md" />
            <span class="income-name">{{ i.category.name }}</span>
            <span class="income-pct numeric">{{ formatPercent(incomeTotal ? i.amount / incomeTotal : 0) }}</span>
            <strong class="income-amount numeric tone-income">{{ formatAmount(i.amount) }}</strong>
          </li>
        </ul>
        <div v-else class="no-income">
          <AppIcon name="info" :size="20" aria-hidden="true" />
          <p>本月暂无收入记录</p>
        </div>
      </ChartCard>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.month-pick {
  min-width: 180px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
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

.ranked {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  min-width: 0;
}
.rank-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
}
.rank-num {
  width: 20px;
  text-align: center;
  font: var(--type-label-large-size) / 2 var(--font-num);
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
}
.rank-info {
  flex: 1;
  min-width: 0;
}
.rank-line {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}
.rank-name {
  font: var(--type-body-medium-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface);
}
.rank-amount {
  font-weight: 650;
  color: var(--color-on-surface);
}
.rank-bar {
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-highest);
  overflow: hidden;
  margin: var(--space-1) 0;
}
.rank-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width var(--motion-long) var(--ease-emphasized-decelerate);
}
.rank-meta {
  display: flex;
  justify-content: space-between;
  font: var(--type-label-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.income-list {
  display: flex;
  flex-direction: column;
}
.income-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-outline-variant);
  min-width: 0;
}
.income-row:last-child {
  border-bottom: none;
}
.income-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--type-body-medium-size) / 1.5 var(--font-sans);
}
.income-pct {
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.income-amount {
  font-weight: 650;
}
.tone-income {
  color: var(--color-income);
}

.no-income {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-10) 0;
  color: var(--color-on-surface-variant);
  font: var(--type-body-medium-size) / 1.5 var(--font-sans);
}

@media (min-width: 600px) {
  .stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-4);
  }
}
@media (min-width: 1024px) {
  .two-col {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }
  .donut-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .donut-layout > :first-child {
    flex-shrink: 0;
  }
  .ranked {
    max-width: 420px;
  }
}
</style>
