<script setup lang="ts">
/**
 * TransactionCard — 交易卡（Mobile 列表形态，信息更全）
 * 桌面 Table 的移动替代形态：更大触控面积、完整标签与备注。
 */
import { computed } from 'vue'
import type { Transaction } from '../../data/types'
import { useLedger } from '../../composables/useLedger'
import { formatRelativeDate, formatSignedAmount } from '../../data/format'
import CategoryAvatar from './CategoryAvatar.vue'

const props = withDefaults(
  defineProps<{
    transaction: Transaction
    showDate?: boolean
  }>(),
  { showDate: true },
)

const emit = defineEmits<{ click: [] }>()

const { categoryById, accountById } = useLedger()

const cat = computed(() => categoryById(props.transaction.category))
const acc = computed(() => accountById(props.transaction.account))
const isIncome = computed(() => props.transaction.type === 'income')
const typeText = computed(() => (isIncome.value ? '收入' : '支出'))
</script>

<template>
  <button class="tx-card" type="button" @click="emit('click')">
    <CategoryAvatar :category="cat" size="lg" />
    <div class="info">
      <p class="desc">{{ transaction.description }}</p>
      <p class="meta">
        <span class="type-tag" :class="isIncome ? 'tone-income' : 'tone-expense'">{{ typeText }}</span>
        <span>{{ cat.name }}</span>
        <span v-if="acc">· {{ acc.name }}</span>
      </p>
      <div v-if="transaction.tags.length" class="tags" aria-label="标签">
        <span v-for="tag in transaction.tags" :key="tag" class="tag">#{{ tag }}</span>
      </div>
      <p v-if="transaction.note" class="note">{{ transaction.note }}</p>
    </div>
    <div class="right">
      <strong class="amount numeric" :class="isIncome ? 'tone-income' : 'tone-expense'">
        {{ formatSignedAmount(transaction.type, transaction.amount) }}
      </strong>
      <span v-if="showDate" class="date">{{ formatRelativeDate(transaction.date) }}</span>
    </div>
  </button>
</template>

<style scoped>
.tx-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-4);
  border-radius: var(--radius-large);
  background: var(--color-surface-container-low);
  text-align: left;
  transition: background-color var(--motion-fast) var(--ease-standard);
  cursor: pointer;
  min-width: 0;
}
.tx-card:active {
  background: var(--color-surface-container-high);
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.desc {
  font: var(--type-body-large-size) / 1.35 var(--font-sans);
  font-weight: 550;
  color: var(--color-on-surface);
}
.meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font: var(--type-body-small-size) / 1.3 var(--font-sans);
  color: var(--color-on-surface-variant);
  flex-wrap: wrap;
}

.type-tag {
  font-weight: var(--type-label-medium-weight);
  padding: 1px var(--space-2);
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

.tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.tag {
  font: var(--type-label-small-size) / 1.4 var(--font-sans);
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
}
.note {
  font: var(--type-body-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
  flex-shrink: 0;
}
.amount {
  font-size: var(--type-title-small-size);
  font-weight: 650;
  white-space: nowrap;
}
.date {
  font: var(--type-body-small-size) / 1.3 var(--font-sans);
  color: var(--color-on-surface-variant);
  white-space: nowrap;
}
</style>
