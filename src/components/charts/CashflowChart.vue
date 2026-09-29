<script setup lang="ts">
/**
 * CashflowChart — 收支趋势面积图（收入 / 支出双系列）
 * 响应式：
 * - Desktop：完整坐标轴 + 全部刻度 + 悬浮 tooltip
 * - Tablet：减少网格密度
 * - Mobile：简化图例、短月份标签、仅 2 条网格线，tooltip 触屏可用
 * 无障碍：role=img + 汇总 aria-label + 视觉隐藏数据表。
 */
import { computed, ref } from 'vue'
import { useElementWidth, usePrefersReducedMotion } from '../../composables/useMisc'
import { chartUid, niceScale, smoothPath, type CashflowPoint, type Point } from './chartUtils'
import { formatCompact, formatMonthShort } from '../../data/format'

const props = withDefaults(
  defineProps<{
    data: CashflowPoint[]
    height?: number
  }>(),
  { height: 260 },
)

const wrapEl = ref<HTMLElement | null>(null)
const width = useElementWidth(wrapEl)
const reduced = usePrefersReducedMotion()

const gradIncome = chartUid('cf-in')
const gradExpense = chartUid('cf-ex')

const dense = computed(() => width.value > 0 && width.value < 480)
const padL = computed(() => (dense.value ? 34 : 44))
const padR = 8
const padT = 12
const padB = 26

const viewH = computed(() => props.height)

const innerW = computed(() => Math.max(0, width.value - padL.value - padR))
const innerH = computed(() => viewH.value - padT - padB)

const max = computed(() =>
  niceScale(Math.max(1, ...props.data.flatMap((d) => [d.income, d.expense])), dense.value ? 2 : 4),
)

const xAt = (i: number) =>
  padL.value + (props.data.length <= 1 ? innerW.value / 2 : (i / (props.data.length - 1)) * innerW.value)
const yAt = (v: number) => padT + innerH.value * (1 - v / max.value.max)

const incomePts = computed<Point[]>(() => props.data.map((d, i) => ({ x: xAt(i), y: yAt(d.income) })))
const expensePts = computed<Point[]>(() => props.data.map((d, i) => ({ x: xAt(i), y: yAt(d.expense) })))

const incomeLine = computed(() => smoothPath(incomePts.value))
const expenseLine = computed(() => smoothPath(expensePts.value))
const incomeArea = computed(
  () => `${incomeLine.value} L${xAt(props.data.length - 1)},${padT + innerH.value} L${padL.value},${padT + innerH.value} Z`,
)
const expenseArea = computed(
  () => `${expenseLine.value} L${xAt(props.data.length - 1)},${padT + innerH.value} L${padL.value},${padT + innerH.value} Z`,
)

/** x 轴标签抽稀 */
const labelStep = computed(() => {
  if (dense.value) return props.data.length > 4 ? 2 : 1
  return props.data.length > 8 ? 2 : 1
})

const hoverIdx = ref<number | null>(null)

function onPointerMove(e: PointerEvent) {
  const rect = wrapEl.value?.getBoundingClientRect()
  if (!rect || !props.data.length) return
  const x = e.clientX - rect.left
  const ratio = (x - padL.value) / Math.max(1, innerW.value)
  const idx = Math.round(ratio * (props.data.length - 1))
  hoverIdx.value = Math.min(props.data.length - 1, Math.max(0, idx))
}
const onPointerLeave = () => (hoverIdx.value = null)

const hoverData = computed(() => (hoverIdx.value == null ? null : props.data[hoverIdx.value]))
const tooltipStyle = computed(() => {
  if (hoverIdx.value == null) return {}
  const x = xAt(hoverIdx.value)
  const flip = x > width.value - 130
  return {
    left: `${x}px`,
    top: '8px',
    transform: flip ? 'translateX(-100%)' : 'translateX(8px)',
  }
})

const totalIncome = computed(() => props.data.reduce((s, d) => s + d.income, 0))
const totalExpense = computed(() => props.data.reduce((s, d) => s + d.expense, 0))
</script>

<template>
  <div class="cashflow">
    <!-- 图例 -->
    <div class="legend" aria-hidden="true">
      <span class="legend-item"><i class="dot dot-income" />收入</span>
      <span class="legend-item"><i class="dot dot-expense" />支出</span>
    </div>

    <div
      ref="wrapEl"
      class="plot"
      role="img"
      :aria-label="`最近 ${data.length} 个月收支趋势：收入合计 ${formatCompact(totalIncome)}，支出合计 ${formatCompact(totalExpense)}`"
      @pointermove="onPointerMove"
      @pointerdown="onPointerMove"
      @pointerleave="onPointerLeave"
    >
      <svg :width="width || '100%'" :height="viewH" class="svg">
        <defs>
          <linearGradient :id="gradIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-income)" stop-opacity="0.26" />
            <stop offset="100%" stop-color="var(--color-income)" stop-opacity="0.02" />
          </linearGradient>
          <linearGradient :id="gradExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-expense)" stop-opacity="0.22" />
            <stop offset="100%" stop-color="var(--color-expense)" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- 网格与 y 轴标签 -->
        <g>
          <template v-for="t in max.ticks" :key="t">
            <line
              v-if="t > 0"
              :x1="padL"
              :x2="padL + innerW"
              :y1="yAt(t)"
              :y2="yAt(t)"
              class="grid"
            />
            <text :x="padL - 6" :y="yAt(t) + 4" class="ytick" text-anchor="end">
              {{ formatCompact(t).replace('¥', '') }}
            </text>
          </template>
        </g>

        <!-- 面积与曲线 -->
        <path :d="expenseArea" :fill="`url(#${gradExpense})`" class="series" :class="{ grow: !reduced }" />
        <path :d="incomeArea" :fill="`url(#${gradIncome})`" class="series" :class="{ grow: !reduced }" />
        <path :d="expenseLine" fill="none" stroke="var(--color-expense)" stroke-width="2.2" stroke-linecap="round" class="line" />
        <path :d="incomeLine" fill="none" stroke="var(--color-income)" stroke-width="2.2" stroke-linecap="round" class="line" />

        <!-- 悬浮参考线与数据点 -->
        <g v-if="hoverIdx != null">
          <line
            :x1="xAt(hoverIdx)"
            :x2="xAt(hoverIdx)"
            :y1="padT"
            :y2="padT + innerH"
            class="guide"
          />
          <circle :cx="xAt(hoverIdx)" :cy="yAt(data[hoverIdx].expense)" r="4.5" class="pt" fill="var(--color-expense)" />
          <circle :cx="xAt(hoverIdx)" :cy="yAt(data[hoverIdx].income)" r="4.5" class="pt" fill="var(--color-income)" />
        </g>

        <!-- x 轴标签 -->
        <g>
          <template v-for="(d, i) in data" :key="d.month">
            <text
              v-if="i % labelStep === 0 || i === data.length - 1"
              :x="xAt(i)"
              :y="viewH - 6"
              class="xtick"
              :text-anchor="i === data.length - 1 && i !== 0 ? 'end' : 'middle'"
            >
              {{ formatMonthShort(d.month) }}
            </text>
          </template>
        </g>
      </svg>

      <!-- Tooltip -->
      <div v-if="hoverData" class="tooltip numeric" :style="tooltipStyle" role="presentation">
        <p class="tt-month">{{ formatMonthShort(hoverData.month) }}</p>
        <p class="tt-row"><i class="dot dot-income" />收入 <strong>{{ formatCompact(hoverData.income) }}</strong></p>
        <p class="tt-row"><i class="dot dot-expense" />支出 <strong>{{ formatCompact(hoverData.expense) }}</strong></p>
      </div>
    </div>

    <!-- 视觉隐藏数据表（屏幕阅读器） -->
    <table class="sr-only">
      <caption>最近 {{ data.length }} 个月收支明细</caption>
      <thead>
        <tr><th scope="col">月份</th><th scope="col">收入</th><th scope="col">支出</th></tr>
      </thead>
      <tbody>
        <tr v-for="d in data" :key="d.month">
          <th scope="row">{{ d.month }}</th>
          <td>{{ d.income.toFixed(2) }} 元</td>
          <td>{{ d.expense.toFixed(2) }} 元</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.cashflow {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
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
  flex-shrink: 0;
}
.dot-income { background: var(--color-income); }
.dot-expense { background: var(--color-expense); }

.plot {
  position: relative;
  width: 100%;
  touch-action: pan-y;
  min-width: 0;
}
.svg {
  display: block;
}

.grid {
  stroke: var(--chart-grid);
  stroke-width: 1;
}
.ytick,
.xtick {
  fill: var(--color-on-surface-variant);
  font-size: 10px;
  font-family: var(--font-num);
}

.series.grow {
  animation: fade-in var(--motion-long) var(--ease-standard);
}
@keyframes fade-in {
  from { opacity: 0; }
}

.guide {
  stroke: var(--color-outline);
  stroke-dasharray: 3 3;
}
.pt {
  stroke: var(--color-surface-container-low);
  stroke-width: 2;
}

.tooltip {
  position: absolute;
  pointer-events: none;
  background: var(--chart-tooltip-bg);
  color: var(--chart-tooltip-fg);
  border-radius: var(--radius-medium);
  padding: var(--space-2) var(--space-3);
  box-shadow: var(--elevation-level-2);
  min-width: 108px;
  z-index: 2;
}
.tt-month {
  font: var(--type-label-small-size) / 1.4 var(--font-sans);
  opacity: 0.75;
}
.tt-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--type-body-small-size);
  white-space: nowrap;
}
.tt-row strong {
  margin-left: auto;
  font-size: var(--type-label-medium-size);
}
</style>
