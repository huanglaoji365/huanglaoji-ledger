<script setup lang="ts">
/**
 * PageHeader — 页面标题区（Desktop 主要标题承载；各端复用）
 * title 必填；description 可选；actions 放页面级操作按钮。
 */
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  { description: '' },
)
</script>

<template>
  <header class="page-header">
    <div class="text">
      <h1 class="title">{{ title }}</h1>
      <p v-if="description" class="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.title {
  font: var(--type-headline-small-size) / var(--type-headline-small-line-height) var(--font-sans);
  font-weight: var(--type-headline-small-weight);
  letter-spacing: 0;
  color: var(--color-on-surface);
}
@media (min-width: 1024px) {
  .title {
    font-size: var(--type-headline-medium-size);
    line-height: var(--type-headline-medium-line-height);
  }
}

.description {
  margin-top: var(--space-1);
  font: var(--type-body-medium-size) / var(--type-body-medium-line-height) var(--font-sans);
  color: var(--color-on-surface-variant);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>
