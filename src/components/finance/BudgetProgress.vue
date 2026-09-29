<script setup lang="ts">
/**
 * BudgetProgress — 预算进度（裸组件，BudgetCard 与仪表盘复用）
 * status: normal / warning / over — 颜色 + 文字双重编码。
 */
import { computed } from 'vue'
import type { BudgetProgress as ProgressData } from '../../data/types'
import ProgressBar from '../ui/ProgressBar.vue'
import { formatAmount, formatPercent } from '../../data/format'

const props = withDefaults(
  defineProps<{
    budget: ProgressData
    showRemaining?: boolean
  }>(),
  { showRemaining: true },
)

const tone = computed(() => {
  if (props.budget.status === 'over') return 'error'
  if (props.budget.status === 'warning') return 'warning'
  return 'primary'
})

const statusText = computed(() => {
  if (props.budget.status === 'over') return '已超支'
  if (props.budget.status === 'warning') return '接近上限'
  return '进行中'
})
</script>

<template>
  <div class="budget-progress">
    <div class="row">
      <span class="used numeric">
        已用 <strong>{{ formatAmount(budget.spent) }}</strong> / {{ formatAmount(budget.amount) }}
      </span>
      <span class="pct" :class="`tone-${tone}`">{{ formatPercent(budget.ratio) }}</span>
    </div>
    <ProgressBar :value="budget.spent" :max="budget.amount" :tone="tone" :label="`${statusText}，已使用 ${formatPercent(budget.ratio)}`" />
    <p v-if="showRemaining" class="remaining" :class="{ over: budget.status === 'over' }">
      <template v-if="budget.status === 'over'">超支 {{ formatAmount(Math.abs(budget.remaining)) }}</template>
      <template v-else>剩余 {{ formatAmount(budget.remaining) }}</template>
      <span class="sr-only">（{{ statusText }}）</span>
    </p>
  </div>
</template>

<style scoped>
.budget-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}
.used {
  font: var(--type-body-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.used strong {
  color: var(--color-on-surface);
  font-weight: 650;
}
.pct {
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  font-weight: 650;
}
.pct.tone-primary { color: var(--color-primary); }
.pct.tone-warning { color: var(--color-warning); }
.pct.tone-error { color: var(--color-error); }

.remaining {
  font: var(--type-body-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.remaining.over {
  color: var(--color-error);
  font-weight: 550;
}
</style>
