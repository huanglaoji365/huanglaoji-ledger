<script setup lang="ts">
/**
 * BrandMark — 品牌标识（图标 + 名称）
 */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <RouterLink to="/" class="brand" :class="{ compact }" aria-label="黄老吉记账 首页">
    <span class="logo" aria-hidden="true">
      <AppIcon name="piggy" :size="22" />
    </span>
    <span v-if="!compact" class="name">黄老吉记账</span>
  </RouterLink>
</template>

<script lang="ts">
import AppIcon from '../ui/AppIcon.vue'
export default { components: { AppIcon } }
</script>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-on-surface);
  border-radius: var(--radius-medium);
}
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-medium);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  flex-shrink: 0;
}
.name {
  font: var(--type-title-medium-size) / 1.2 var(--font-sans);
  font-weight: 650;
  letter-spacing: 0.2px;
  white-space: nowrap;
}
</style>
