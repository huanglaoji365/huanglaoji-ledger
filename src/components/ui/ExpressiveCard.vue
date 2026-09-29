<script setup lang="ts">
/**
 * ExpressiveCard — Material 3 Expressive 大圆角强调卡
 * 非对称圆角 + hover 轻微放大，用于仪表盘核心指标区。
 */
withDefaults(
  defineProps<{
    tone?: 'primary' | 'income' | 'expense' | 'surface'
    padding?: 'md' | 'lg'
  }>(),
  { tone: 'primary', padding: 'lg' },
)

defineSlots<{ default: () => unknown }>()
</script>

<template>
  <div class="expressive-card" :class="[`tone-${tone}`, `padding-${padding}`]">
    <slot />
  </div>
</template>

<style scoped>
.expressive-card {
  position: relative;
  overflow: hidden;
  border-radius:
    var(--radius-extra-large)
    var(--radius-large)
    var(--radius-extra-large)
    var(--radius-large);
  container-type: inline-size;
  transition: transform var(--motion-medium) var(--ease-emphasized-decelerate);
}
/* 品牌色柔光装饰（M3 Expressive 层次感） */
.expressive-card::before {
  content: "";
  position: absolute;
  top: -58%;
  right: -14%;
  width: 52%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, currentColor 15%, transparent), transparent 72%);
  pointer-events: none;
}
@media (hover: hover) {
  .expressive-card:hover {
    transform: translateY(-3px);
  }
}

.tone-primary {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}
.tone-income {
  background: var(--color-income-container);
  color: var(--color-on-income-container);
}
.tone-expense {
  background: var(--color-expense-container);
  color: var(--color-on-expense-container);
}
.tone-surface {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}

.padding-md { padding: var(--space-5); }
.padding-lg { padding: var(--space-6); }
@media (max-width: 599.98px) {
  .padding-lg { padding: var(--space-5); }
}
</style>
