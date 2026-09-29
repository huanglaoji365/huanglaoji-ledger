<script setup lang="ts">
/**
 * BarChart — 分组柱状图（月度收支对比 / 预算场景通用）
 * dense 模式（宽度 < 480）：隐藏数值标签、缩短类目轴。
 * 无障碍：role=img + aria-label 汇总 + 视觉隐藏数据表。
 */
import { computed, ref } from 'vue'
import { useElementWidth, usePrefersReducedMotion } from '../../composables/useMisc'
import { niceScale, type BarGroup } from './chartUtils'
import { formatCompact } from '../../data/format'

const props = withDefaults(
  defineProps<{
    groups: BarGroup[]
    seriesLabels?: string[]
    seriesColors?: string[]
    height?: number
    showValues?: boolean
  }>(),
  {
    seriesLabels: () => ['收入', '支出'],
    seriesColors: () => ['var(--color-income)', 'var(--color-expense)'],
    height: 240,
    showValues: true,
  },
)

const wrapEl = ref<HTMLElement | null>(null)
const width = useElementWidth(wrapEl)
const reduced = usePrefersReducedMotion()

const dense = computed(() => width.value > 0 && width.value < 480)
const padL = computed(() => (dense.value ? 34 : 44))
const padR = 6
const padT = dense.value ? 8 : 22
const padB = 26

const innerW = computed(() => Math.max(0, width.value - padL.value - padR))
const innerH = computed(() => props.height - padT - padB)

const max = computed(() =>
  niceScale(Math.max(1, ...props.groups.flatMap((g) => g.values)), dense.value ? 2 : 4),
)

const slotW = computed(() => innerW.value / Math.max(1, props.groups.length))
const barW = computed(() => {
  const n = props.groups[0]?.values.length ?? 1
  const raw = (slotW.value * 0.62) / n
  return Math.min(raw, n > 1 ? 18 : 40)
})

const yAt = (v: number) => padT + innerH.value * (1 - v / max.value.max)

function barX(gi: number, si: number): number {
  const n = props.groups[0]?.values.length ?? 1
  const groupStart = padL.value + gi * slotW.value
  const groupW = barW.value * n + 4 * (n - 1)
  return groupStart + (slotW.value - groupW) / 2 + si * (barW.value + 4)
}

const hoverGroup = ref<number | null>(null)

function groupLabelAt(i: number): string {
  return props.groups[i]?.label ?? ''
}
</script>

<template>
  <div class="barchart">
    <div
      ref="wrapEl"
      class="plot"
      role="img"
      :aria-label="`柱状图，共 ${groups.length} 组：` + groups.map((g) => `${g.label} ${g.values.join('、')}`).join('；')"
    >
      <svg :width="width || '100%'" :height="height" class="svg">
        <template v-for="t in max.ticks" :key="t">
          <line v-if="t > 0" :x1="padL" :x2="padL + innerW" :y1="yAt(t)" :y2="yAt(t)" class="grid" />
          <text :x="padL - 6" :y="yAt(t) + 4" class="ytick" text-anchor="end">
            {{ formatCompact(t).replace('¥', '') }}
          </text>
        </template>

        <g
          v-for="(g, gi) in groups"
          :key="g.label"
          @pointerenter="hoverGroup = gi"
          @pointerleave="hoverGroup = null"
        >
          <rect
            :x="padL + gi * slotW"
            :y="padT"
            :width="slotW"
            :height="innerH"
            class="hover-zone"
            :class="{ on: hoverGroup === gi }"
          />
          <template v-for="(v, si) in g.values" :key="si">
            <rect
              :x="barX(gi, si)"
              :y="yAt(v)"
              :width="barW"
              :height="Math.max(2, padT + innerH - yAt(v))"
              :fill="seriesColors[si]"
              rx="4"
              class="bar"
              :class="{ grow: !reduced, dim: hoverGroup != null && hoverGroup !== gi }"
              :style="{ animationDelay: `${gi * 40}ms` }"
            />
            <text
              v-if="showValues && !dense"
              :x="barX(gi, si) + barW / 2"
              :y="yAt(v) - 6"
              class="vlabel numeric"
              text-anchor="middle"
            >
              {{ formatCompact(v).replace('¥', '') }}
            </text>
          </template>
          <text :x="padL + gi * slotW + slotW / 2" :y="height - 6" class="xtick" text-anchor="middle">
            {{ g.label }}
          </text>
        </g>
      </svg>

      <!-- tooltip -->
      <div
        v-if="hoverGroup != null && !dense"
        class="tooltip"
        :style="{ left: `${padL + hoverGroup * slotW + slotW / 2}px` }"
      >
        <p class="tt-title">{{ groupLabelAt(hoverGroup) }}</p>
        <p v-for="(v, si) in groups[hoverGroup].values" :key="si" class="tt-row">
          <i class="dot" :style="{ background: seriesColors[si] }" />{{ seriesLabels[si] }}
          <strong class="numeric">{{ formatCompact(v) }}</strong>
        </p>
      </div>
    </div>

    <div class="legend" aria-hidden="true">
      <span v-for="(l, si) in seriesLabels" :key="l" class="legend-item">
        <i class="dot" :style="{ background: seriesColors[si] }" />{{ l }}
      </span>
    </div>

    <table class="sr-only">
      <caption>分组柱状图数据</caption>
      <thead>
        <tr>
          <th scope="col">类目</th>
          <th v-for="l in seriesLabels" :key="l" scope="col">{{ l }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in groups" :key="g.label">
          <th scope="row">{{ g.label }}</th>
          <td v-for="(v, i) in g.values" :key="i">{{ v.toFixed(2) }} 元</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.barchart {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.plot {
  position: relative;
  width: 100%;
  min-width: 0;
}
.svg {
  display: block;
}
.grid {
  stroke: var(--chart-grid);
}
.ytick,
.xtick {
  fill: var(--color-on-surface-variant);
  font-size: 10px;
  font-family: var(--font-num);
}
.hover-zone {
  fill: transparent;
}
.hover-zone.on {
  fill: color-mix(in srgb, var(--color-on-surface) 4%, transparent);
}
.bar.grow {
  transform-origin: bottom;
  animation: bar-rise var(--motion-long) var(--ease-emphasized-decelerate) backwards;
}
@keyframes bar-rise {
  from {
    transform: scaleY(0);
  }
}
.bar.dim {
  opacity: 0.45;
}
.vlabel {
  fill: var(--color-on-surface-variant);
  font-size: 9.5px;
}

.tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  pointer-events: none;
  background: var(--chart-tooltip-bg);
  color: var(--chart-tooltip-fg);
  border-radius: var(--radius-medium);
  padding: var(--space-2) var(--space-3);
  box-shadow: var(--elevation-level-2);
  white-space: nowrap;
  z-index: 2;
}
.tt-title {
  font: var(--type-label-small-size) / 1.4 var(--font-sans);
  opacity: 0.75;
}
.tt-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--type-body-small-size);
}
.tt-row strong {
  margin-left: auto;
  padding-left: var(--space-3);
}

.legend {
  display: flex;
  gap: var(--space-4);
  align-self: flex-end;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font: var(--type-label-medium-size) / 1 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
</style>
