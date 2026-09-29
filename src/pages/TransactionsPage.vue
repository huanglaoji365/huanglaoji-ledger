<script setup lang="ts">
/**
 * Transactions 交易明细 — 筛选 + 摘要 + 列表
 * Desktop: 完整表格；Tablet: 紧凑表格；Mobile: 卡片分组列表。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLedger } from '../composables/useLedger'
import { useUi } from '../composables/useUi'
import { openEditFromItem } from '../composables/useEdit'
import { formatAmount, formatMonthLabel, monthOf } from '../data/format'
import PageHeader from '../components/layout/PageHeader.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import SearchInput from '../components/ui/SearchInput.vue'
import IconButton from '../components/ui/IconButton.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import FilterChip from '../components/ui/FilterChip.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import TransactionTable from '../components/finance/TransactionTable.vue'
import TransactionGroupList from '../components/finance/TransactionGroupList.vue'
import { useBreakpoints } from '../composables/useBreakpoint'

const ledger = useLedger()
const ui = useUi()
const route = useRoute()
const { desktop, mobile } = useBreakpoints()

/* ---------------- 筛选状态 ---------------- */

const PAGE_SIZE = 30
const visibleCount = ref(PAGE_SIZE)

const query = ref('')
const typeFilter = ref<'all' | 'income' | 'expense'>('all')
const accountFilter = ref('all')
const monthFilter = ref(ledger.currentMonth.value)
const selectedCategories = ref<string[]>([])

const monthOptions = computed(() => [
  { value: 'all', label: '全部时间' },
  ...ledger.monthlyTotals.value
    .slice()
    .reverse()
    .map((m) => ({ value: m.month, label: formatMonthLabel(m.month) })),
])

const accountOptions = computed(() => [
  { value: 'all', label: '全部账户' },
  ...ledger.state.accounts.map((a) => ({ value: a.id, label: a.name })),
])

const expenseCategories = computed(() =>
  ledger.state.categories.filter((c) => c.type === 'expense'),
)

/* 从账户页「查看流水」带 ?account= 进入 */
function applyQueryAccount(acc: unknown) {
  if (typeof acc === 'string' && ledger.accountById(acc)) {
    accountFilter.value = acc
    monthFilter.value = 'all'
  }
}
onMounted(() => applyQueryAccount(route.query.account))
watch(
  () => route.query.account,
  (v) => applyQueryAccount(v),
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return ledger.state.transactions.filter((t) => {
    if (monthFilter.value !== 'all' && monthOf(t.date) !== monthFilter.value) return false
    if (typeFilter.value !== 'all' && t.type !== typeFilter.value) return false
    if (accountFilter.value !== 'all' && t.account !== accountFilter.value) return false
    if (selectedCategories.value.length && !selectedCategories.value.includes(t.category)) return false
    if (q) {
      const hay = `${t.description} ${t.note ?? ''} ${t.tags.join(' ')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

const visible = computed(() => filtered.value.slice(0, visibleCount.value))

const summary = computed(() => {
  let income = 0
  let expense = 0
  for (const t of filtered.value) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, count: filtered.value.length }
})

function toggleCategory(id: string) {
  const i = selectedCategories.value.indexOf(id)
  if (i === -1) selectedCategories.value.push(id)
  else selectedCategories.value.splice(i, 1)
  visibleCount.value = PAGE_SIZE
}

function clearAllFilters() {
  query.value = ''
  typeFilter.value = 'all'
  accountFilter.value = 'all'
  monthFilter.value = ledger.currentMonth.value
  selectedCategories.value = []
  visibleCount.value = PAGE_SIZE
}

const hasFilter = computed(
  () =>
    query.value !== '' ||
    typeFilter.value !== 'all' ||
    accountFilter.value !== 'all' ||
    monthFilter.value !== ledger.currentMonth.value ||
    selectedCategories.value.length > 0,
)

watch(
  [query, typeFilter, accountFilter, monthFilter],
  () => {
    visibleCount.value = PAGE_SIZE
  },
)

/* 导出 CSV */
function exportCsv() {
  const blob = new Blob(['\ufeff' + ledger.exportCSV()], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `黄老吉记账-交易明细-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ui.toast('CSV 已导出')
}
</script>

<template>
  <div class="tx-page page">
    <PageHeader title="交易明细" :description="`共 ${summary.count} 笔记录`">
      <template #actions>
        <AppButton v-if="desktop" variant="outlined" icon="download" @click="exportCsv">导出 CSV</AppButton>
        <IconButton v-else icon="download" label="导出 CSV" variant="tonal" @click="exportCsv" />
      </template>
    </PageHeader>

    <!-- 筛选区 -->
    <AppCard padding="md" class="filters">
      <SearchInput v-model="query" placeholder="搜索描述、标签或备注" class="search" />
      <div class="filter-row">
        <SegmentedControl
          v-model="typeFilter"
          block
          class="type-seg"
          label="交易类型筛选"
          :options="[
            { value: 'all', label: '全部' },
            { value: 'expense', label: '支出' },
            { value: 'income', label: '收入' },
          ]"
        />
        <AppSelect v-model="monthFilter" :options="monthOptions" label="时间" class="sel-time" />
        <AppSelect v-model="accountFilter" :options="accountOptions" label="账户" class="sel-account" />
      </div>

      <div class="chips scroll-thin" role="group" aria-label="按分类筛选">
        <FilterChip
          v-for="c in expenseCategories"
          :key="c.id"
          :label="c.name"
          :dot-color="`var(--chart-color-${c.color})`"
          :selected="selectedCategories.includes(c.id)"
          @toggle="toggleCategory(c.id)"
        />
      </div>

      <div v-if="hasFilter" class="clear-row">
        <AppButton variant="text" icon="refresh" @click="clearAllFilters">清除筛选</AppButton>
      </div>
    </AppCard>

    <!-- 摘要 -->
    <div class="summary numeric" aria-live="polite">
      <span class="sum-item">收入 <strong class="tone-income">{{ formatAmount(summary.income) }}</strong></span>
      <span class="divider" aria-hidden="true">·</span>
      <span class="sum-item">支出 <strong class="tone-expense">{{ formatAmount(summary.expense) }}</strong></span>
      <span class="divider" aria-hidden="true">·</span>
      <span class="sum-item">结余 <strong>{{ formatAmount(summary.income - summary.expense) }}</strong></span>
    </div>

    <!-- 列表：Desktop/Tablet 表格，Mobile 分组卡片 -->
    <template v-if="filtered.length">
      <TransactionTable
        v-if="desktop"
        :transactions="visible"
        @row-click="openEditFromItem"
      />
      <TransactionTable
        v-else-if="!mobile"
        :transactions="visible"
        compact
        class="tablet-table"
        @row-click="openEditFromItem"
      />
      <TransactionGroupList
        v-else
        variant="card"
        :transactions="visible"
        @item-click="openEditFromItem"
      />

      <div v-if="filtered.length > visibleCount" class="more">
        <AppButton variant="tonal" size="lg" block @click="visibleCount += PAGE_SIZE">
          加载更多（还有 {{ filtered.length - visibleCount }} 笔）
        </AppButton>
      </div>
    </template>
    <EmptyState
      v-else
      icon="search"
      title="没有符合条件的交易"
      description="试试放宽筛选条件，或点击右下角「记一笔」。"
    >
      <AppButton variant="tonal" icon="refresh" @click="clearAllFilters">清除筛选</AppButton>
    </EmptyState>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.search {
  width: 100%;
  max-width: 420px;
}

/* Mobile：类型独占一行满宽，时间/账户各占一半 */
.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3) var(--space-2);
}
.type-seg {
  grid-column: 1 / -1;
}

.chips {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent);
  mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent);
}
.chips::-webkit-scrollbar {
  display: none;
}

.clear-row {
  display: flex;
  justify-content: flex-end;
}

.summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: 0 var(--space-1);
  font: var(--type-body-medium-size) / 1.6 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.sum-item strong {
  font-size: var(--type-body-large-size);
  font-weight: 650;
  margin-left: var(--space-1);
}
.tone-income { color: var(--color-income); }
.tone-expense { color: var(--color-expense); }
.divider {
  opacity: 0.5;
}

.more {
  display: flex;
  justify-content: center;
}

@media (min-width: 600px) {
  /* Tablet / Desktop：横向一行，类型居左、两个下拉靠右 */
  .filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-3);
  }
  .type-seg {
    margin-right: auto;
  }
  .chips {
    scrollbar-width: thin;
    -webkit-mask-image: none;
    mask-image: none;
  }
}
@media (min-width: 1024px) {
  .page {
    gap: var(--space-6);
  }
}
</style>
