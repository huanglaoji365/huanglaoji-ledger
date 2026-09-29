<script setup lang="ts">
/**
 * EmptyState — 空状态（列表 / 筛选无结果）
 */
withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
  }>(),
  { icon: 'wallet', description: '' },
)
</script>

<template>
  <div class="empty">
    <div class="icon-wrap" aria-hidden="true">
      <AppIcon :name="icon" :size="28" />
    </div>
    <p class="title">{{ title }}</p>
    <p v-if="description" class="description">{{ description }}</p>
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
.empty {
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
  background: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
}
.title {
  font: var(--type-title-medium-size) / var(--type-title-medium-line-height) var(--font-sans);
  font-weight: var(--type-title-medium-weight);
  color: var(--color-on-surface);
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
