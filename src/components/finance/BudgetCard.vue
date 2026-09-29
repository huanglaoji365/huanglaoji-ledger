<script setup lang="ts">
/**
 * BudgetCard — 预算卡（分类 + 进度 + 操作）
 * 超支 / 临界状态：颜色 + 徽标文字双编码。
 */
import { computed } from 'vue'
import type { BudgetProgress as ProgressData } from '../../data/types'
import { useLedger } from '../../composables/useLedger'
import CategoryAvatar from './CategoryAvatar.vue'
import BudgetProgress from './BudgetProgress.vue'
import IconButton from '../ui/IconButton.vue'
import AppIcon from '../ui/AppIcon.vue'

const props = defineProps<{
  budget: ProgressData
}>()

const emit = defineEmits<{ edit: []; delete: [] }>()

const { categoryById } = useLedger()
const cat = computed(() => categoryById(props.budget.category))

const statusBadge = computed(() => {
  if (props.budget.status === 'over') return { text: '已超支', icon: 'x-circle', cls: 'over' }
  if (props.budget.status === 'warning') return { text: '接近上限', icon: 'alert-circle', cls: 'warning' }
  return { text: '正常', icon: 'check-circle', cls: 'normal' }
})
</script>

<template>
  <article class="budget-card" :aria-label="`${cat.name}预算`">
    <header class="head">
      <div class="cat">
        <CategoryAvatar :category="cat" size="md" />
        <div class="names">
          <h3 class="name">{{ cat.name }}</h3>
          <span class="period">每月预算</span>
        </div>
      </div>
      <span class="badge" :class="statusBadge.cls">
        <AppIcon :name="statusBadge.icon" :size="13" />
        {{ statusBadge.text }}
      </span>
    </header>
    <BudgetProgress :budget="budget" />
    <footer class="actions">
      <IconButton icon="pencil" label="编辑预算" variant="standard" size="sm" @click="emit('edit')" />
      <IconButton icon="trash" label="删除预算" variant="standard" size="sm" @click="emit('delete')" />
    </footer>
  </article>
</template>

<style scoped>
.budget-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  background: var(--color-surface-container-low);
  border-radius: var(--radius-large);
  min-width: 0;
}
@media (max-width: 599.98px) {
  .budget-card {
    padding: var(--space-4);
  }
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}
.cat {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.names {
  min-width: 0;
}
.name {
  font: var(--type-title-small-size) / 1.4 var(--font-sans);
  font-weight: var(--type-title-small-weight);
  color: var(--color-on-surface);
}
.period {
  font: var(--type-label-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font: var(--type-label-small-size) / 1.5 var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  white-space: nowrap;
  flex-shrink: 0;
}
.badge.normal {
  color: var(--color-success);
  background: var(--color-success-container);
}
.badge.warning {
  color: var(--color-warning);
  background: var(--color-warning-container);
}
.badge.over {
  color: var(--color-error);
  background: var(--color-error-container);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
  margin-top: calc(var(--space-1) * -1);
}
</style>
