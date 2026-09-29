<script setup lang="ts">
/**
 * ChartCard — 图表卡容器
 * 统一标题 / 副标题 / actions / 图表插槽；container-type 供图表降密度。
 */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
  }>(),
  { subtitle: '' },
)
</script>

<template>
  <section class="chart-card" aria-labelledby="chart-title">
    <header class="head">
      <div class="titles">
        <h3 id="chart-title" class="title">{{ title }}</h3>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.chart-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-surface-container-low);
  border-radius: var(--radius-large);
  container-type: inline-size;
  min-width: 0;
}
@media (max-width: 599.98px) {
  .chart-card {
    padding: var(--space-4);
  }
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.titles {
  min-width: 0;
}
.title {
  font: var(--type-title-medium-size) / var(--type-title-medium-line-height) var(--font-sans);
  font-weight: var(--type-title-medium-weight);
  color: var(--color-on-surface);
}
.subtitle {
  margin-top: 2px;
  font: var(--type-body-small-size) / var(--type-body-small-line-height) var(--font-sans);
  color: var(--color-on-surface-variant);
}
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.footer {
  border-top: 1px solid var(--color-outline-variant);
  padding-top: var(--space-4);
}
</style>
