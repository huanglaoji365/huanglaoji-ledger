<script setup lang="ts">
/**
 * AppSelect — 下拉选择（原生 select + 自定义外观）
 * 原生控件保证移动端系统选择器与无障碍行为。
 */
export interface SelectOption {
  value: string
  label: string
}

withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    label: string
    disabled?: boolean
    block?: boolean
  }>(),
  { disabled: false, block: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = `sel-${Math.random().toString(36).slice(2, 8)}`

const onChange = (e: Event) => emit('update:modelValue', (e.target as HTMLSelectElement).value)
</script>

<template>
  <div class="select-wrap" :class="{ block }">
    <label :for="id" class="label">{{ label }}</label>
    <div class="control">
      <select
        :id="id"
        class="select"
        :value="modelValue"
        :disabled="disabled || undefined"
        @change="onChange"
      >
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <svg class="chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9.5 6 6 6-6" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.select-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}
.block {
  width: 100%;
}

.label {
  padding-left: var(--space-2);
  font: var(--type-label-medium-size) / var(--type-label-medium-line-height) var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  color: var(--color-on-surface-variant);
}

.control {
  position: relative;
  min-width: 0;
}

.select {
  width: 100%;
  height: 48px;
  padding: 0 var(--space-8) 0 var(--space-4);
  appearance: none;
  border: none;
  border-radius: var(--radius-medium);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  font: var(--type-body-large-size) / var(--type-body-large-line-height) var(--font-sans);
  cursor: pointer;
  transition: background-color var(--motion-short) var(--ease-standard);
  text-overflow: ellipsis;
}
.select:hover:not(:disabled) {
  background: var(--color-surface-container-highest);
}
.select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.select:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 1px;
}

.chevron {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-on-surface-variant);
  pointer-events: none;
}
</style>
