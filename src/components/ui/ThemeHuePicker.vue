<script setup lang="ts">
/**
 * ThemeHuePicker — 主题色相滑块（OKLCH 0–360°）
 * 彩虹轨道 + 跟随当前色相的滑块头；带「恢复默认」与色相值显示。
 * 拖动实时驱动 --hue，全套品牌色 / 容器色 / 表面色即时联动。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    defaultHue?: number
  }>(),
  { defaultHue: 75 },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const onInput = (e: Event) => {
  emit('update:modelValue', Number((e.target as HTMLInputElement).value))
}

const progress = computed(() => `${(props.modelValue / 360) * 100}%`)
const thumbColor = computed(() => `oklch(0.72 0.14 ${props.modelValue})`)
</script>

<template>
  <div class="hue-picker">
    <div class="head">
      <button
        type="button"
        class="reset state-layer"
        aria-label="恢复默认色相"
        title="恢复默认"
        @click="emit('update:modelValue', defaultHue)"
      >
        <AppIcon name="refresh" :size="14" />
      </button>
      <span class="value numeric" aria-hidden="true">{{ modelValue }}</span>
    </div>

    <div class="slider-shell">
      <input
        type="range"
        class="hue-slider"
        min="0"
        max="360"
        step="5"
        :value="modelValue"
        aria-label="主题色相"
        :aria-valuetext="`${modelValue} 度色相`"
        :style="{ '--thumb': thumbColor }"
        @input="onInput"
      />
    </div>
  </div>
</template>

<style scoped>
.hue-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-small);
  color: var(--color-on-surface-variant);
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}
.reset:active {
  transform: scale(0.9);
}
.value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 26px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-small);
  background: var(--color-surface-container-highest);
  color: var(--color-on-surface);
  font-size: var(--type-label-medium-size);
  font-weight: 650;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

/* 滑块：彩虹轨道 */
.slider-shell {
  width: 100%;
  height: 24px;
  padding: 0 var(--space-1);
  border-radius: var(--radius-small);
  background: light-dark(oklch(0.80 0.10 0), oklch(0.70 0.10 0));
  user-select: none;
}

.hue-slider {
  -webkit-appearance: none;
  appearance: none;
  display: block;
  width: 100%;
  height: 24px;
  background: transparent;
  cursor: pointer;
}
.hue-slider:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  border-radius: var(--radius-small);
}

.hue-slider::-webkit-slider-runnable-track {
  height: 24px;
  border-radius: var(--radius-small);
  background: linear-gradient(
    to right,
    oklch(0.75 0.13 0),
    oklch(0.75 0.13 30),
    oklch(0.75 0.13 60),
    oklch(0.75 0.13 90),
    oklch(0.75 0.13 120),
    oklch(0.75 0.13 150),
    oklch(0.75 0.13 180),
    oklch(0.75 0.13 210),
    oklch(0.75 0.13 240),
    oklch(0.75 0.13 270),
    oklch(0.75 0.13 300),
    oklch(0.75 0.13 330),
    oklch(0.75 0.13 360)
  );
}
.hue-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--thumb);
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
  transition: transform var(--motion-fast) var(--ease-standard);
}
.hue-slider:active::-webkit-slider-thumb {
  transform: scale(1.15);
}

.hue-slider::-moz-range-track {
  height: 24px;
  border-radius: var(--radius-small);
  background: linear-gradient(
    to right,
    oklch(0.75 0.13 0),
    oklch(0.75 0.13 30),
    oklch(0.75 0.13 60),
    oklch(0.75 0.13 90),
    oklch(0.75 0.13 120),
    oklch(0.75 0.13 150),
    oklch(0.75 0.13 180),
    oklch(0.75 0.13 210),
    oklch(0.75 0.13 240),
    oklch(0.75 0.13 270),
    oklch(0.75 0.13 300),
    oklch(0.75 0.13 330),
    oklch(0.75 0.13 360)
  );
}
.hue-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--thumb);
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
}
</style>
