<script setup lang="ts">
/**
 * TransactionTable — 交易表格（Desktop 形态）
 * 粘性表头、可排序（日期/金额）、横向溢出保护、行内操作。
 * Tablet 中等密度：隐藏分类列。
 */
import { computed, ref } from 'vue'
import type { Transaction } from '../../data/types'
import { useLedger } from '../../composables/useLedger'
import { formatShortDate, formatSignedAmount } from '../../data/format'
import CategoryAvatar from './CategoryAvatar.vue'
import IconButton from '../ui/IconButton.vue'
import EmptyState from '../ui/EmptyState.vue'
import AppIcon from '../ui/AppIcon.vue'

const props = defineProps<{
  transactions: Transaction[]
  /** tablet 紧凑模式 */
  compact?: boolean
}>()

const emit = defineEmits<{ rowClick: [t: Transaction] }>()

const { categoryById, accountById } = useLedger()

type SortKey = 'date' | 'amount'
const sortKey = ref<SortKey>('date')
const sortAsc = ref(false)

const sorted = computed(() => {
  const list = [...props.transactions]
  list.sort((a, b) => {
    const dir = sortAsc.value ? 1 : -1
    if (sortKey.value === 'date') {
      return a.date === b.date ? b.id.localeCompare(a.id) * dir : a.date < b.date ? -dir : dir
    }
    return (a.amount - b.amount) * dir
  })
  return list
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = false
  }
}

const typeText = (t: Transaction) => (t.type === 'income' ? '收入' : '支出')
</script>

<template>
  <div v-if="transactions.length" class="table-wrap scroll-thin" :class="{ compact }">
    <table class="tx-table">
      <thead>
        <tr>
          <th scope="col">
            <button class="sort-btn" @click="toggleSort('date')">
              日期
              <AppIcon :name="sortKey === 'date' ? (sortAsc ? 'chevron-up' : 'chevron-down') : 'chevron-down'" :size="14" :class="{ hidden: sortKey !== 'date' }" />
            </button>
          </th>
          <th scope="col">描述</th>
          <th scope="col">分类</th>
          <th v-if="!compact" scope="col">账户</th>
          <th scope="col">类型</th>
          <th scope="col" class="num">
            <button class="sort-btn" @click="toggleSort('amount')">
              金额
              <AppIcon :name="sortKey === 'amount' ? (sortAsc ? 'chevron-up' : 'chevron-down') : 'chevron-down'" :size="14" :class="{ hidden: sortKey !== 'amount' }" />
            </button>
          </th>
          <th scope="col"><span class="sr-only">操作</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in sorted" :key="t.id" class="row" tabindex="0" @click="emit('rowClick', t)" @keydown.enter="emit('rowClick', t)">
          <td class="date-cell">{{ formatShortDate(t.date) }}</td>
          <td class="desc-cell">
            <span class="desc">{{ t.description }}</span>
            <span v-if="t.tags.length" class="tags">#{{ t.tags.join(' #') }}</span>
          </td>
          <td class="cat-cell">
            <CategoryAvatar :category="t.category" size="sm" />
            <span class="cat-name">{{ categoryById(t.category).name }}</span>
          </td>
          <td v-if="!compact" class="acc-cell">{{ accountById(t.account)?.name ?? '—' }}</td>
          <td class="type-cell">
            <span class="type-tag" :class="t.type === 'income' ? 'tone-income' : 'tone-expense'">{{ typeText(t) }}</span>
          </td>
          <td class="amount-cell">
            <strong class="numeric" :class="t.type === 'income' ? 'tone-income' : 'tone-expense'">
              {{ formatSignedAmount(t.type, t.amount) }}
            </strong>
          </td>
          <td class="action-cell">
            <slot name="actions" :transaction="t" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <EmptyState v-else icon="receipt" title="没有符合条件的交易" description="换个筛选条件，或记录一笔新的交易吧。" />
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-large);
  background: var(--color-surface-container-low);
}

.tx-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-surface-container);
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font: var(--type-label-medium-size) / 1.3 var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  color: var(--color-on-surface-variant);
  white-space: nowrap;
  border-bottom: 1px solid var(--color-outline-variant);
}

.row {
  border-bottom: 1px solid var(--color-outline-variant);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}
tbody tr:last-child .row,
tbody tr:last-child {
  border-bottom: none;
}
@media (hover: hover) {
  .row:hover {
    background: var(--color-surface-container-high);
  }
}
.row:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: -2px;
}

td {
  padding: var(--space-3) var(--space-4);
  font: var(--type-body-medium-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface);
  vertical-align: middle;
  white-space: nowrap;
}

.date-cell {
  color: var(--color-on-surface-variant);
  width: 72px;
}
.desc-cell {
  max-width: 260px;
  min-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.desc {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tags {
  font-size: var(--type-label-small-size);
  color: var(--color-primary);
  opacity: 0.85;
}
.cat-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.cat-name {
  color: var(--color-on-surface-variant);
}
.type-tag {
  font-size: var(--type-label-small-size);
  font-weight: var(--type-label-medium-weight);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
}
.tone-income {
  color: var(--color-income);
  background: color-mix(in srgb, var(--color-income) 12%, transparent);
}
.tone-expense {
  color: var(--color-expense);
  background: color-mix(in srgb, var(--color-expense) 12%, transparent);
}
.amount-cell strong {
  font-size: var(--type-body-large-size);
  font-weight: 650;
}
.num {
  text-align: right;
}
.amount-cell {
  text-align: right;
}
.action-cell {
  width: 48px;
  text-align: right;
  padding-right: var(--space-3);
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: inherit;
  font: inherit;
  border-radius: var(--radius-small);
}
.sort-btn .hidden {
  opacity: 0.25;
}

.compact td,
.compact thead th {
  padding: var(--space-2) var(--space-3);
}
</style>
