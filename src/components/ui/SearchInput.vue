<script setup lang="ts">
/**
 * SearchInput — 搜索框（leading 图标 + 可清除）
 */
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    label?: string
  }>(),
  { placeholder: '搜索…', label: '搜索' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = `sch-${Math.random().toString(36).slice(2, 8)}`
const focused = ref(false)

const onInput = (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)
const clear = () => emit('update:modelValue', '')
</script>

<template>
  <div class="search" :class="{ focused }">
    <AppIcon name="search" :size="18" class="lead" aria-hidden="true" />
    <label :for="id" class="sr-only">{{ label }}</label>
    <input
      :id="id"
      class="input"
      type="search"
      :placeholder="placeholder"
      :value="modelValue"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
    />
    <button
      v-if="modelValue"
      class="clear state-layer"
      aria-label="清除搜索"
      @click="clear"
    >
      <AppIcon name="close" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  transition: background-color var(--motion-short) var(--ease-standard);
  min-width: 0;
}
.search:focus-within {
  background: var(--color-surface-container-highest);
  box-shadow: inset 0 0 0 1.5px var(--color-primary);
}

.lead {
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
}

.input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font: var(--type-body-medium-size) / var(--type-body-medium-line-height) var(--font-sans);
  color: var(--color-on-surface);
}
.input:focus {
  outline: none;
}
.input::-webkit-search-cancel-button {
  display: none;
}

.clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
}
</style>
