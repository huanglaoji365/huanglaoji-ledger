<script setup lang="ts">
/**
 * AmountInput — 大额输入框（记账核心输入）
 * ¥ 前缀 + 大号数字 + 金额格式化预览；移动端呼起数字键盘。
 */
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    error?: string
    disabled?: boolean
    autofocus?: boolean
  }>(),
  { error: '', disabled: false, autofocus: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = `amt-${Math.random().toString(36).slice(2, 8)}`
const focused = ref(false)

const display = computed(() => props.modelValue)

const onInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  // 只允许数字与一个小数点
  let v = el.value.replace(/[^\d.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`
  if (parts[1]?.length > 2) v = `${parts[0]}.${parts[1].slice(0, 2)}`
  el.value = v
  emit('update:modelValue', v)
}

const preview = computed(() => {
  const n = Number(props.modelValue)
  if (!props.modelValue || Number.isNaN(n) || n <= 0) return ''
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})
</script>

<template>
  <div class="amount-field" :class="{ focused, error: !!error, disabled }">
    <label :for="id" class="sr-only">金额</label>
    <div class="row">
      <span class="symbol" aria-hidden="true">¥</span>
      <input
        :id="id"
        class="input numeric"
        type="text"
        inputmode="decimal"
        placeholder="0.00"
        :value="display"
        :disabled="disabled || undefined"
        :autofocus="autofocus"
        :aria-invalid="!!error || undefined"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />
      <span class="preview numeric" aria-hidden="true">{{ preview }}</span>
    </div>
    <p v-if="error" class="error-text" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.amount-field {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-medium);
  background: var(--color-surface-container-high);
  border: 1.5px solid transparent;
  transition: border-color var(--motion-short) var(--ease-standard);
}
.amount-field.focused {
  border-color: var(--color-primary);
  background: var(--color-surface-container-highest);
}
.amount-field.error {
  border-color: var(--color-error);
}
.amount-field.disabled {
  opacity: 0.4;
}

.row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  min-width: 0;
}
.symbol {
  font-size: 26px;
  font-weight: 550;
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
}
.input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--color-on-surface);
  line-height: 1.25;
}
.input:focus {
  outline: none;
}
@media (max-width: 359.98px) {
  .input {
    font-size: 32px;
  }
}

.preview {
  font-size: var(--type-body-medium-size);
  color: var(--color-on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40%;
}

.error-text {
  margin-top: var(--space-1);
  font: var(--type-body-small-size) / var(--type-body-small-line-height) var(--font-sans);
  color: var(--color-error);
}
</style>
