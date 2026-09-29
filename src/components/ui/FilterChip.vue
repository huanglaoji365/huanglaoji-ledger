<script setup lang="ts">
/**
 * FilterChip — 筛选 chip（单选 / 多选 / 可清除）
 * dot: 可选色点（分类色）保持颜色之外还有文字信息。
 */
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    label: string
    selected?: boolean
    icon?: string
    /** 色点颜色（css color 值） */
    dotColor?: string
    removable?: boolean
    disabled?: boolean
  }>(),
  { selected: false, icon: '', dotColor: '', removable: false, disabled: false },
)

const emit = defineEmits<{ toggle: []; remove: [] }>()
</script>

<template>
  <button
    class="chip state-layer"
    :class="{ selected, disabled }"
    :aria-pressed="selected"
    :disabled="disabled || undefined"
    type="button"
    @click="emit('toggle')"
  >
    <AppIcon v-if="selected" name="check" :size="16" class="check" />
    <span v-else-if="dotColor" class="dot" :style="{ background: dotColor }" aria-hidden="true" />
    <AppIcon v-else-if="icon" :name="icon" :size="16" />
    <span class="label">{{ label }}</span>
    <span
      v-if="removable"
      class="remove"
      role="button"
      tabindex="-1"
      aria-label="移除筛选"
      @click.stop="emit('remove')"
    >
      <AppIcon name="close" :size="14" />
    </span>
  </button>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 32px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-outline-variant);
  background: transparent;
  color: var(--color-on-surface-variant);
  font: var(--type-label-large-size) / 1 var(--font-sans);
  white-space: nowrap;
  transition:
    background-color var(--motion-short) var(--ease-standard),
    border-color var(--motion-short) var(--ease-standard);
}
.chip.selected {
  background: var(--color-secondary-container);
  border-color: transparent;
  color: var(--color-on-secondary-container);
}
.chip:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

@media (max-width: 599.98px) {
  .chip {
    height: 40px;
    padding: 0 var(--space-4);
  }
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.check {
  margin-left: calc(var(--space-2) * -1);
}
.label {
  line-height: 1;
}
.remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin: 0 calc(var(--space-2) * -0.5) 0 0;
  border-radius: 50%;
}
.remove:hover {
  background: rgb(0 0 0 / 0.08);
}
</style>
