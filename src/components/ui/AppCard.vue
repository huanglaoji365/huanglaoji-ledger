<script setup lang="ts">
/**
 * Card — 基础卡片容器
 * variant: elevated(浮起) / filled(容器色) / outlined(描边)
 * interactive: 可点击卡片（hover 抬升 + 状态层）
 */
withDefaults(
  defineProps<{
    variant?: 'elevated' | 'filled' | 'outlined'
    interactive?: boolean
    padding?: 'none' | 'sm' | 'md' | 'lg'
    as?: string
  }>(),
  { variant: 'filled', interactive: false, padding: 'md', as: 'div' },
)

defineSlots<{ default: () => unknown }>()
</script>

<template>
  <component
    :is="as"
    class="card"
    :class="[`variant-${variant}`, `padding-${padding}`, { interactive }]"
  >
    <slot />
  </component>
</template>

<style scoped>
.card {
  position: relative;
  border-radius: var(--radius-large);
  background: var(--color-surface-container-low);
  transition:
    box-shadow var(--motion-medium) var(--ease-standard),
    transform var(--motion-medium) var(--ease-standard);
}

.variant-elevated {
  background: var(--color-surface-container-low);
  box-shadow: var(--elevation-level-1);
}
.variant-filled {
  background: var(--color-surface-container-low);
}
.variant-outlined {
  background: var(--color-surface-container-lowest);
  box-shadow: inset 0 0 0 1px var(--color-outline-variant);
}

.padding-none { padding: 0; }
.padding-sm { padding: var(--space-4); }
.padding-md { padding: var(--space-5); }
.padding-lg { padding: var(--space-6); }
@media (max-width: 599.98px) {
  .padding-md { padding: var(--space-4); }
  .padding-lg { padding: var(--space-5); }
}

.card.interactive {
  cursor: pointer;
}
.card.interactive::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .card.interactive:hover {
    transform: translateY(-2px);
    box-shadow: var(--elevation-level-2);
  }
  .card.interactive:hover::after {
    opacity: var(--state-hover-opacity);
  }
}
.card.interactive:active {
  transform: translateY(0) scale(0.99);
}
.card.interactive:active::after {
  opacity: var(--state-pressed-opacity);
}
</style>
