<script setup lang="ts">
/**
 * ProgressBar — 进度条（预算 / 占比）
 * tone: primary / income / expense / warning / success / error
 * indeterminate 用于 LoadingState。
 * 进度同时通过 aria-valuenow 传达，不单独依赖颜色。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value?: number
    max?: number
    tone?: 'primary' | 'income' | 'expense' | 'warning' | 'success' | 'error'
    indeterminate?: boolean
    height?: number
    label?: string
  }>(),
  { value: 0, max: 100, tone: 'primary', indeterminate: false, height: 8, label: '' },
)

const ratio = computed(() => {
  if (props.max <= 0) return 0
  return Math.min(1, Math.max(0, props.value / props.max))
})

const toneVar: Record<string, string> = {
  primary: 'var(--color-primary)',
  income: 'var(--color-income)',
  expense: 'var(--color-expense)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  error: 'var(--color-error)',
}

const trackStyle = computed(() => ({
  height: `${props.height}px`,
  background: toneVar[props.tone],
  '--p': String(ratio.value),
}))
</script>

<template>
  <div
    class="progress"
    role="progressbar"
    :aria-valuenow="indeterminate ? undefined : Math.round(ratio * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label || '进度'"
  >
    <div class="track" :class="{ indeterminate }" :style="trackStyle" />
  </div>
</template>

<style scoped>
.progress {
  width: 100%;
}
.track {
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius-full);
  transform-origin: left;
  transform: scaleX(var(--p, 1));
  transition: transform var(--motion-long) var(--ease-emphasized-decelerate);
}
.track.indeterminate {
  background: var(--color-primary) !important;
  animation: slide 1.1s var(--ease-standard) infinite;
  transform: none;
}
@keyframes slide {
  0% { transform: translateX(-100%) scaleX(0.4); }
  60% { transform: translateX(80%) scaleX(0.4); }
  100% { transform: translateX(240%) scaleX(0.4); }
}
@media (prefers-reduced-motion: reduce) {
  .track {
    transition: none;
  }
  .track.indeterminate {
    animation: none;
    transform: scaleX(0.4);
  }
}
</style>
