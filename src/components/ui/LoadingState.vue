<script setup lang="ts">
/**
 * LoadingState — 加载态（indeterminate 进度条 + 文案）
 */
withDefaults(defineProps<{ label?: string }>(), { label: '加载中…' })
</script>

<template>
  <div class="loading" role="status">
    <span class="spinner" aria-hidden="true" />
    <span class="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-12) var(--space-6);
}
.spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid var(--color-primary-container);
  border-top-color: var(--color-primary);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.label {
  font: var(--type-body-medium-size) / var(--type-body-medium-line-height) var(--font-sans);
  color: var(--color-on-surface-variant);
}
</style>
