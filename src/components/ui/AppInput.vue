<script setup lang="ts">
/**
 * AppInput — 填充式文本输入（浮动 label）
 * 状态：hover / focused / disabled / error，带 aria 属性。
 */
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: string
    placeholder?: string
    disabled?: boolean
    error?: string
    maxlength?: number
    autofocus?: boolean
    inputmode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'none'
  }>(),
  {
    type: 'text',
    placeholder: '',
    disabled: false,
    error: '',
    maxlength: undefined,
    autofocus: false,
    inputmode: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = `in-${Math.random().toString(36).slice(2, 8)}`
const focused = ref(false)
const floating = computed(() => focused.value || props.modelValue.length > 0)

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="field" :class="{ focused, error: !!error, disabled }">
    <label :for="id" class="label" :class="{ floating }">{{ label }}</label>
    <input
      :id="id"
      class="input"
      :type="type"
      :value="modelValue"
      :placeholder="floating ? placeholder : ''"
      :disabled="disabled || undefined"
      :maxlength="maxlength"
      :autofocus="autofocus"
      :inputmode="inputmode"
      :aria-invalid="!!error || undefined"
      :aria-describedby="error ? `${id}-err` : undefined"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
    />
    <p v-if="error" :id="`${id}-err`" class="error-text" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.field {
  position: relative;
  min-width: 0;
}

.label {
  position: absolute;
  left: var(--space-4);
  top: 18px;
  color: var(--color-on-surface-variant);
  font: var(--type-body-large-size) / 1 var(--font-sans);
  pointer-events: none;
  transform-origin: left top;
  transition:
    transform var(--motion-short) var(--ease-standard),
    color var(--motion-short) var(--ease-standard);
  max-width: calc(100% - var(--space-8));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.label.floating {
  transform: translateY(-14px) scale(0.75);
  color: var(--color-primary);
}
.field.error .label.floating {
  color: var(--color-error);
}

.input {
  width: 100%;
  height: 56px;
  padding: var(--space-6) var(--space-4) var(--space-2);
  border: none;
  border-bottom: 1px solid var(--color-outline);
  border-radius: var(--radius-medium) var(--radius-medium) 0 0;
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  font: var(--type-body-large-size) / var(--type-body-large-line-height) var(--font-sans);
  transition:
    background-color var(--motion-short) var(--ease-standard),
    border-color var(--motion-short) var(--ease-standard);
}
.input:hover:not(:disabled) {
  background: var(--color-surface-container-highest);
}
.field.focused .input {
  border-bottom: 2px solid var(--color-primary);
  padding-bottom: calc(var(--space-2) - 1px);
}
.field.error .input {
  border-bottom-color: var(--color-error);
}
.field.error.focused .input {
  border-bottom: 2px solid var(--color-error);
}
.input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.input:focus {
  outline: none;
}

.error-text {
  margin-top: var(--space-1);
  padding-left: var(--space-4);
  font: var(--type-body-small-size) / var(--type-body-small-line-height) var(--font-sans);
  color: var(--color-error);
}
</style>
