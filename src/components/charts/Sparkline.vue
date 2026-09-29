<script setup lang="ts">
/**
 * Sparkline — 迷你趋势线（StatCard 内使用）
 */
import { computed } from 'vue'
import { chartUid, niceScale, smoothPath } from './chartUtils'
import { usePrefersReducedMotion } from '../../composables/useMisc'

const props = withDefaults(
  defineProps<{
    data: number[]
    color?: string
    height?: number
  }>(),
  { color: 'var(--color-primary)', height: 36 },
)

const reduced = usePrefersReducedMotion()
const gradId = chartUid('spark')
const W = 100

const max = computed(() => niceScale(Math.max(...props.data, 1), 2).max)
const pts = computed(() =>
  props.data.map((v, i) => ({
    x: props.data.length === 1 ? W / 2 : (i / (props.data.length - 1)) * W,
    y: 30 - (v / max.value) * 26 + 2,
  })),
)
const linePath = computed(() => smoothPath(pts.value))
const areaPath = computed(() => {
  if (!pts.value.length) return ''
  return `${linePath.value} L${W},32 L0,32 Z`
})
</script>

<template>
  <svg
    class="spark"
    :viewBox="`0 0 ${W} 32`"
    preserveAspectRatio="none"
    :style="{ height: `${height}px` }"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.24" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path :d="areaPath" :fill="`url(#${gradId})`" class="area" />
    <path
      :d="linePath"
      fill="none"
      :stroke="color"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
      stroke-linecap="round"
      class="line"
      :class="{ animate: !reduced }"
    />
  </svg>
</template>

<style scoped>
.spark {
  display: block;
  width: 100%;
}
.line.animate {
  stroke-dasharray: 240;
  stroke-dashoffset: 240;
  animation: draw var(--motion-long) var(--ease-standard) forwards;
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
