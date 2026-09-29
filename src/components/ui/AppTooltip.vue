<script setup lang="ts">
/**
 * AppTooltip — 轻量提示（hover / focus 显示）
 * 纯 CSS 实现，桌面为主；触屏不依赖 hover，不阻塞操作。
 */
withDefaults(defineProps<{ text: string; position?: 'top' | 'bottom' }>(), {
  position: 'top',
})
</script>

<template>
  <span class="tooltip-wrap">
    <slot />
    <span class="tooltip" role="tooltip" :class="`pos-${position}`">{{ text }}</span>
  </span>
</template>

<style scoped>
.tooltip-wrap {
  position: relative;
  display: inline-flex;
}

.tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-small);
  background: var(--chart-tooltip-bg);
  color: var(--chart-tooltip-fg);
  font: var(--type-label-medium-size) / var(--type-label-medium-line-height) var(--font-sans);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  z-index: var(--z-tooltip);
  transition:
    opacity var(--motion-short) var(--ease-standard),
    transform var(--motion-short) var(--ease-standard);
}
.pos-top {
  bottom: calc(100% + 6px);
}
.pos-bottom {
  top: calc(100% + 6px);
}

@media (hover: hover) {
  .tooltip-wrap:hover .tooltip,
  .tooltip-wrap:focus-within .tooltip {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}
</style>
