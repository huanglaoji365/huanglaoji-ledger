<script setup lang="ts">
/**
 * SegmentedControl — 分段按钮（M3 SegmentedButton）
 * 单选；density 通过密度自适应；支持图标。
 * role="radiogroup" + roving tabindex，键盘 ←/→ 切换。
 */
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

export interface SegmentOption<T extends string = string> {
  value: T
  label: string
  icon?: string
}

const props = defineProps<{
  options: SegmentOption[]
  modelValue: string
  label: string
  block?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const groupRef = ref<HTMLElement | null>(null)

function select(value: string) {
  emit('update:modelValue', value)
}

function onKeydown(e: KeyboardEvent) {
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  let next = idx
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % props.options.length
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + props.options.length) % props.options.length
  else return
  e.preventDefault()
  const value = props.options[next]!.value
  select(value)
  requestAnimationFrame(() => {
    groupRef.value
      ?.querySelector<HTMLButtonElement>(`[data-value="${value}"]`)
      ?.focus()
  })
}
</script>

<template>
  <div
    ref="groupRef"
    class="segmented"
    :class="{ block }"
    role="radiogroup"
    :aria-label="label"
    @keydown="onKeydown"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      class="segment state-layer"
      :class="{ selected: modelValue === opt.value }"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :tabindex="modelValue === opt.value ? 0 : -1"
      :data-value="opt.value"
      type="button"
      @click="select(opt.value)"
    >
      <AppIcon v-if="opt.icon" :name="opt.icon" :size="16" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  border-radius: var(--radius-full);
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--color-outline);
}
.segmented.block {
  display: flex;
  width: 100%;
}

.segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 40px;
  padding: 0 var(--space-4);
  background: transparent;
  color: var(--color-on-surface);
  font: var(--type-label-large-size) / 1 var(--font-sans);
  font-weight: var(--type-label-large-weight);
  white-space: nowrap;
  transition: background-color var(--motion-short) var(--ease-standard);
}
.segment + .segment {
  border-left: 1px solid var(--color-outline);
}
.segment.selected {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}
.segment.block {
  flex: 1;
}
@media (min-width: 600px) {
  /* PC / Tablet：分段按钮收缩为内容宽度并左对齐，不再拉成满宽色块 */
  .segmented.block {
    display: inline-flex;
    width: fit-content;
    align-self: flex-start;
  }
  .segment.block {
    flex: 0 0 auto;
    min-width: 120px;
    padding: 0 var(--space-5);
  }
}
@media (max-width: 599.98px) {
  .segment {
    min-height: 44px;
    flex: 1;
  }
}
</style>
