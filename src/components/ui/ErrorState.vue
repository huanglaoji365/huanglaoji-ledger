<script setup lang="ts">
/**
 * ErrorState — 错误态（含重试操作）
 */
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  { title: '出错了', description: '发生了意外问题，请重试。' },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error" role="alert">
    <div class="icon-wrap" aria-hidden="true">
      <AppIcon name="alert-circle" :size="28" />
    </div>
    <p class="title">{{ title }}</p>
    <p class="description">{{ description }}</p>
    <div v-if="$slots.default" class="action">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import AppIcon from './AppIcon.vue'
export default { components: { AppIcon } }
</script>

<style scoped>
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-12) var(--space-6);
  text-align: center;
}
.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-error-container);
  color: var(--color-on-error-container);
}
.title {
  font: var(--type-title-medium-size) / var(--type-title-medium-line-height) var(--font-sans);
  font-weight: var(--type-title-medium-weight);
}
.description {
  max-width: 360px;
  font: var(--type-body-medium-size) / var(--type-body-medium-line-height) var(--font-sans);
  color: var(--color-on-surface-variant);
}
.action {
  margin-top: var(--space-3);
}
</style>
