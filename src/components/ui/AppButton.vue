<script setup lang="ts">
/**
 * AppButton — 主按钮
 * variant: filled / tonal / outlined / text / danger
 * size: sm(32) / md(40) / lg(48，触屏友好)
 * 状态：hover / pressed / focus-visible / disabled / loading
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    icon?: string
    trailingIcon?: string
    block?: boolean
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'filled', size: 'md', icon: '', trailingIcon: '', block: false, loading: false, disabled: false, type: 'button' },
)

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    class="app-button state-layer"
    :class="[`variant-${variant}`, `size-${size}`, { block, loading }]"
    :type="type"
    :disabled="isDisabled || undefined"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <AppIcon v-else-if="icon" :name="icon" :size="size === 'lg' ? 20 : 18" />
    <span class="label"><slot /></span>
    <AppIcon v-if="trailingIcon" :name="trailingIcon" :size="size === 'lg' ? 20 : 18" />
  </button>
</template>

<style scoped>
.app-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-full);
  font: var(--type-label-large-size) / var(--type-label-large-line-height) var(--font-sans);
  font-weight: var(--type-label-large-weight);
  letter-spacing: var(--type-label-large-tracking);
  white-space: nowrap;
  transition:
    box-shadow var(--motion-short) var(--ease-standard),
    background-color var(--motion-short) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}
.app-button:active:not(:disabled) {
  transform: scale(0.98);
}

.size-sm { height: 32px; padding: 0 var(--space-4); }
.size-md { height: 40px; padding: 0 var(--space-6); }
.size-lg { height: 48px; padding: 0 var(--space-8); font-size: 15px; }
.block { display: flex; width: 100%; }

.variant-filled {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.variant-filled:hover:not(:disabled) {
  box-shadow: var(--elevation-level-1);
}

.variant-tonal {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}

.variant-outlined {
  background: transparent;
  color: var(--color-primary);
  box-shadow: inset 0 0 0 1px var(--color-outline);
}

.variant-text {
  background: transparent;
  color: var(--color-primary);
  padding: 0 var(--space-3);
}

.variant-danger {
  background: var(--color-error);
  color: var(--color-on-error);
}
.variant-danger:hover:not(:disabled) {
  box-shadow: var(--elevation-level-1);
}

.app-button:disabled {
  cursor: not-allowed;
}

@media (max-width: 599.98px) {
  .size-md { height: 44px; }
  .size-lg { height: 52px; }
}

/* loading spinner */
.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
