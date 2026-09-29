<script setup lang="ts">
/**
 * StatCard — 指标卡（仪表盘 / 分析页复用）
 * label + 金额 + 趋势 delta + 可选 sparkline 插槽
 * 移动端横向滚动网格中使用固定最小宽度，桌面端 auto-fit。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string
    sub?: string
    /** 趋势方向与幅度（如 +12.4 表示比上期多 12.4%） */
    delta?: number | null
    deltaLabel?: string
    tone?: 'neutral' | 'income' | 'expense'
  }>(),
  { sub: '', delta: null, deltaLabel: '', tone: 'neutral' },
)

const deltaTone = computed(() => {
  if (props.delta == null) return ''
  return props.delta >= 0 ? 'up' : 'down'
})

/** 长金额自动缩小字号（配合 cqi 基准） */
const valueShrink = computed(() => {
  const len = props.value.length
  if (len <= 8) return 1
  if (len <= 11) return 0.85
  if (len <= 14) return 0.72
  return 0.6
})
</script>

<template>
  <div class="stat-card" :class="`tone-${tone}`">
    <div class="head">
      <span class="label">{{ label }}</span>
      <span v-if="delta != null" class="delta" :class="deltaTone">
        <AppIcon :name="delta >= 0 ? 'arrow-up-right' : 'arrow-down-right'" :size="14" />
        {{ Math.abs(delta).toFixed(1) }}%
        <span class="sr-only">{{ delta >= 0 ? '上升' : '下降' }}</span>
      </span>
    </div>
    <div class="value numeric" :style="{ '--vshrink': valueShrink }" :aria-label="`${label} ${value}`" :title="value">
      {{ value }}
    </div>
    <div v-if="sub" class="sub">{{ sub }}</div>
    <div v-else-if="deltaLabel" class="sub">{{ deltaLabel }}</div>
    <div v-if="$slots.default" class="extra">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-5);
  background: var(--color-surface-container-low);
  border-radius: var(--radius-large);
  container-type: inline-size;
}
@media (max-width: 599.98px) {
  .stat-card {
    padding: var(--space-4);
  }
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.label {
  font: var(--type-label-large-size) / var(--type-label-large-line-height) var(--font-sans);
  color: var(--color-on-surface-variant);
  white-space: nowrap;
}

.delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font: var(--type-label-medium-size) / var(--type-label-medium-line-height) var(--font-sans);
  font-weight: var(--type-label-medium-weight);
}
.delta.up {
  color: var(--color-income);
  background: var(--color-income-container);
}
.delta.down {
  color: var(--color-expense);
  background: var(--color-expense-container);
}

.value {
  font-size: calc(clamp(22px, 8cqi, 30px) * var(--vshrink, 1));
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tone-income .value { color: var(--color-income); }
.tone-expense .value { color: var(--color-expense); }

.sub {
  font: var(--type-body-small-size) / var(--type-body-small-line-height) var(--font-sans);
  color: var(--color-on-surface-variant);
}
.extra {
  margin-top: var(--space-2);
}
</style>
