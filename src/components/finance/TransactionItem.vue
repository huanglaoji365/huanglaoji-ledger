<script setup lang="ts">
/**
 * TransactionItem — 交易行（列表紧凑形态）
 * 三重编码：颜色 + 符号(+/-) + 文字标签（收入/支出），不只依赖颜色。
 */
import { computed } from 'vue'
import type { Transaction } from '../../data/types'
import { useLedger } from '../../composables/useLedger'
import { formatRelativeDate, formatSignedAmount } from '../../data/format'
import CategoryAvatar from './CategoryAvatar.vue'
import AppIcon from '../ui/AppIcon.vue'
import AmountText from '../ui/AmountText.vue'

const props = withDefaults(
  defineProps<{
    transaction: Transaction
    showDate?: boolean
    clickable?: boolean
  }>(),
  { showDate: false, clickable: true },
)

const emit = defineEmits<{ click: [] }>()

const { categoryById, accountById } = useLedger()

const cat = computed(() => categoryById(props.transaction.category))
const acc = computed(() => accountById(props.transaction.account))
const amountText = computed(() => formatSignedAmount(props.transaction.type, props.transaction.amount))
const isIncome = computed(() => props.transaction.type === 'income')

const typeText = computed(() => (isIncome.value ? '收入' : '支出'))
const typeTone = computed(() => (isIncome.value ? 'income' : 'expense'))
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    class="tx-item"
    :class="{ clickable }"
    :type="clickable ? 'button' : undefined"
    @click="clickable && emit('click')"
  >
    <CategoryAvatar :category="cat" size="md" />
    <div class="info">
      <p class="desc">{{ transaction.description }}</p>
      <p class="meta">
        <span class="type-tag" :class="`tone-${typeTone}`">{{ typeText }}</span>
        <span>{{ cat.name }}</span>
        <span v-if="acc" class="acc">
          <AppIcon :name="acc.icon" :size="12" aria-hidden="true" />
          {{ acc.name }}
        </span>
        <span v-if="showDate" class="date">{{ formatRelativeDate(transaction.date) }}</span>
      </p>
    </div>
    <div class="amount-col">
      <strong class="amount numeric" :class="`tone-${typeTone}`" :aria-label="`${typeText} ${amountText}`">
        <AmountText :text="amountText" />
      </strong>
      <span v-if="showDate" class="sr-only">{{ formatRelativeDate(transaction.date) }}</span>
    </div>
  </component>
</template>

<style scoped>
.tx-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-2);
  border-radius: var(--radius-medium);
  text-align: left;
  min-width: 0;
}
.tx-item.clickable {
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .tx-item.clickable:hover {
    background: var(--color-surface-container-high);
  }
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.desc {
  font: var(--type-body-large-size) / 1.35 var(--font-sans);
  font-weight: 500;
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font: var(--type-body-small-size) / 1.3 var(--font-sans);
  color: var(--color-on-surface-variant);
  overflow: hidden;
  flex-wrap: nowrap;
}
.meta > span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.meta > .acc {
  flex-shrink: 1;
}
.meta > .date {
  flex-shrink: 0;
}

.type-tag {
  font-weight: var(--type-label-medium-weight);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--type-label-small-size);
}
.type-tag.tone-income {
  color: var(--color-income);
  background: color-mix(in srgb, var(--color-income) 12%, transparent);
}
.type-tag.tone-expense {
  color: var(--color-expense);
  background: color-mix(in srgb, var(--color-expense) 12%, transparent);
}

.amount-col {
  flex: 0 1 auto;
  max-width: 48%;
  min-width: 0;
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.amount {
  font-size: var(--type-title-small-size);
  font-weight: 650;
  letter-spacing: 0.1px;
  white-space: nowrap;
}
.tone-income { color: var(--color-income); }
.tone-expense { color: var(--color-expense); }

@media (max-width: 599.98px) {
  .tx-item {
    padding: var(--space-3) var(--space-1);
  }
}
</style>
