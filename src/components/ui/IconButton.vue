<script setup lang="ts">
/**
 * IconButton — 图标按钮
 * variant: standard / tonal / filled / outlined
 * selected: 切换态（如收藏、筛选激活）
 * 必须提供 aria-label（纯图标无文字）。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    variant?: 'standard' | 'tonal' | 'filled' | 'outlined'
    size?: 'sm' | 'md'
    selected?: boolean
    disabled?: boolean
  }>(),
  { variant: 'standard', size: 'md', selected: false, disabled: false },
)

const emit = defineEmits<{ click: [e: MouseEvent] }>()

const handleClick = (e: MouseEvent) => {
  if (!props.disabled) emit('click', e)
}
</script>

<template>
  <button
    class="icon-button state-layer"
    :class="[`variant-${variant}`, `size-${size}`, { selected, disabled }]"
    :aria-label="label"
    :aria-pressed="selected"
    :disabled="disabled || undefined"
    @click="handleClick"
  >
    <AppIcon :name="icon" :size="size === 'sm' ? 18 : 20" />
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  transition: background-color var(--motion-short) var(--ease-standard);
}

.size-md {
  width: 40px;
  height: 40px;
}
.size-sm {
  width: 32px;
  height: 32px;
}
@media (max-width: 599.98px) {
  .size-md {
    width: 44px;
    height: 44px;
  }
}

.variant-standard {
  color: var(--color-on-surface-variant);
}
.variant-tonal {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}
.variant-filled {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.variant-outlined {
  color: var(--color-on-surface-variant);
  box-shadow: inset 0 0 0 1px var(--color-outline);
}

.icon-button.selected {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}
.variant-filled.selected {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
</style>
