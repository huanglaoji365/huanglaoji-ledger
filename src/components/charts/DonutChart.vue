<script setup lang="ts">
/**
 * DonutChart — 环形占比图
 * 移动端自动加粗环、收缩内径占比；hover 高亮 + 中心切换显示该分项。
 * 无障碍：role=img + aria-label 汇总。
 */
import { computed, ref } from 'vue'
import { arcPath, type DonutItem } from './chartUtils'
import { usePrefersReducedMotion } from '../../composables/useMisc'
import { formatCompact, formatPercent } from '../../data/format'

const props = withDefaults(
  defineProps<{
    items: DonutItem[]
    centerLabel?: string
    /** 中心副标题（默认为总额） */
    size?: number
  }>(),
  { centerLabel: '总支出', size: 0 },
)

const reduced = usePrefersReducedMotion()

const viewSize = computed(() => props.size || 220)
const stroke = computed(() => (viewSize.value < 200 ? 26 : 22))
const rOuter = computed(() => viewSize.value / 2 - 4)
const rInner = computed(() => rOuter.value - stroke.value)
const C = computed(() => viewSize.value / 2)

const total = computed(() => props.items.reduce((s, i) => s + i.value, 0))

interface Slice {
  item: DonutItem
  path: string
  start: number
  end: number
  ratio: number
}

const slices = computed<Slice[]>(() => {
  let angle = 0
  const gap = props.items.length > 1 ? 1.5 : 0
  return props.items.map((item) => {
    const sweep = total.value > 0 ? (item.value / total.value) * 360 : 0
    const start = angle + gap / 2
    const end = angle + sweep - gap / 2
    angle += sweep
    return {
      item,
      path: arcPath(C.value, C.value, rOuter.value, rInner.value, Math.max(0.01, start), Math.max(start + 0.02, end)),
      start,
      end,
      ratio: total.value > 0 ? item.value / total.value : 0,
    }
  })
})

const hoverIdx = ref<number | null>(null)

const centerTitle = computed(() => {
  if (hoverIdx.value != null && slices.value[hoverIdx.value]) {
    return slices.value[hoverIdx.value]!.item.label
  }
  return props.centerLabel
})
const centerValue = computed(() => {
  if (hoverIdx.value != null && slices.value[hoverIdx.value]) {
    const s = slices.value[hoverIdx.value]!
    return `${formatCompact(s.item.value)} · ${formatPercent(s.ratio)}`
  }
  return formatCompact(total.value)
})

const ariaText = computed(() => {
  const parts = props.items
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((i) => `${i.label} ${formatCompact(i.value)}（${formatPercent(total.value ? i.value / total.value : 0)}）`)
  return `支出构成：${parts.join('，')}，总计 ${formatCompact(total.value)}`
})
</script>

<template>
  <div class="donut-wrap" role="img" :aria-label="ariaText">
    <svg :width="viewSize" :height="viewSize" :viewBox="`0 0 ${viewSize} ${viewSize}`" class="donut">
      <g
        v-for="(s, i) in slices"
        :key="s.item.label"
        class="slice"
        :class="{ dim: hoverIdx != null && hoverIdx !== i, grow: !reduced }"
        :style="{ animationDelay: `${i * 50}ms` }"
        @pointerenter="hoverIdx = i"
        @pointerleave="hoverIdx = null"
      >
        <path :d="s.path" :fill="s.item.color" />
      </g>
      <text :x="C" :y="C - 8" text-anchor="middle" class="c-label">{{ centerTitle }}</text>
      <text :x="C" :y="C + 14" text-anchor="middle" class="c-value numeric">{{ centerValue }}</text>
    </svg>
  </div>
</template>

<style scoped>
.donut-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.donut {
  max-width: 100%;
}
.slice {
  cursor: pointer;
  transform-origin: center;
  transition: opacity var(--motion-short) var(--ease-standard);
}
.slice.dim {
  opacity: 0.4;
}
.slice.grow {
  animation: slice-in var(--motion-long) var(--ease-emphasized-decelerate) backwards;
}
@keyframes slice-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
}

.c-label {
  fill: var(--color-on-surface-variant);
  font-size: 11px;
  font-family: var(--font-sans);
}
.c-value {
  fill: var(--color-on-surface);
  font-size: 16px;
  font-weight: 650;
}
</style>
