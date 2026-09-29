<script setup lang="ts">
/**
 * TransactionGroupList — 按日期分组的交易列表（Mobile / 总览摘要）
 * 每组头：日期（今天/昨天相对化） + 当日净额。
 */
import { computed } from 'vue'
import type { Transaction } from '../../data/types'
import { formatRelativeDate, formatSignedAmount } from '../../data/format'
import TransactionItem from './TransactionItem.vue'
import TransactionCard from './TransactionCard.vue'

const props = withDefaults(
  defineProps<{
    transactions: Transaction[]
    /** card: 移动卡片形态；row: 紧凑行形态 */
    variant?: 'row' | 'card'
    showTime?: boolean
  }>(),
  { variant: 'row', showTime: false },
)

const emit = defineEmits<{ itemClick: [t: Transaction] }>()

const groups = computed(() => {
  const map = new Map<string, Transaction[]>()
  for (const t of props.transactions) {
    const arr = map.get(t.date) ?? []
    arr.push(t)
    map.set(t.date, arr)
  }
  return [...map.entries()].map(([date, items]) => {
    let net = 0
    for (const t of items) net += t.type === 'income' ? t.amount : -t.amount
    return { date, items, net }
  })
})

const dayLabel = (date: string) => formatRelativeDate(date)
const dayNet = (net: number) => (net === 0 ? '持平' : formatSignedAmount(net > 0 ? 'income' : 'expense', Math.abs(net)))
</script>

<template>
  <div class="tx-groups">
    <section v-for="g in groups" :key="g.date" class="group" :aria-label="`${dayLabel(g.date)}的交易`">
      <header class="group-head">
        <h3 class="day">{{ dayLabel(g.date) }}</h3>
        <span v-if="variant === 'card'" class="net numeric" :class="g.net >= 0 ? 'tone-income' : 'tone-expense'">
          净额 {{ dayNet(g.net) }}
        </span>
        <span v-else class="count">{{ g.items.length }}笔</span>
      </header>

      <div v-if="variant === 'card'" class="cards">
        <TransactionCard
          v-for="t in g.items"
          :key="t.id"
          :transaction="t"
          @click="emit('itemClick', t)"
        />
      </div>
      <div v-else class="rows">
        <TransactionItem
          v-for="t in g.items"
          :key="t.id"
          :transaction="t"
          @click="emit('itemClick', t)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.tx-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0 var(--space-2) var(--space-2);
}
.day {
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  font-weight: var(--type-label-large-weight);
  color: var(--color-on-surface-variant);
}
.count {
  font: var(--type-label-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.net {
  font-size: var(--type-label-medium-size);
  font-weight: var(--type-label-medium-weight);
}
.tone-income { color: var(--color-income); }
.tone-expense { color: var(--color-expense); }

.cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.rows {
  background: var(--color-surface-container-low);
  border-radius: var(--radius-large);
  padding: var(--space-1);
}
</style>
