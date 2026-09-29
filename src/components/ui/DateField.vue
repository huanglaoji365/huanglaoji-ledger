<script setup lang="ts">
/**
 * DateField — 日期选择（自研日历弹层 + 快捷项）
 * - 三级选择：日视图 ⇄ 年月面板 ⇄ 年份宫格，跨月/跨年快速跳转
 * - 下方空间不足时浮层自动翻转到上方
 * - 月份切换、今天高亮、未来日期禁用（max）
 * - 键盘：Enter/Space 打开；← → ↑ ↓ 移动；PageUp/PageDown 翻月；Esc 只关浮层（Esc 栈）
 * - 快捷项：今天 / 昨天 / 前天
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import IconButton from './IconButton.vue'
import { pushEscHandler } from '../../composables/useOverlay'
import { useClickOutside } from '../../composables/useMisc'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    max?: string
  }>(),
  { label: '日期', max: '' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const MIN_YEAR = today().getFullYear() - 10

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)
const placement = ref<'below' | 'above'>('below')

const todayIso = isoOf(today())
const maxIso = computed(() => props.max || todayIso)

const display = computed(() => {
  if (!props.modelValue) return '请选择日期'
  const [y, m, d] = props.modelValue.split('-').map(Number)
  return `${y}年${m}月${d}日`
})

function today(): Date {
  return new Date()
}

function isoOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/* ---------------- 浮层开关 ---------------- */

let offEsc: (() => void) | null = null

function openCalendar() {
  const base = props.modelValue ? parseIso(props.modelValue) : today()
  view.value = { y: base.getFullYear(), m: base.getMonth() }
  focusedIso.value = props.modelValue || todayIso
  mode.value = 'days'
  const rect = triggerEl.value?.getBoundingClientRect()
  placement.value = rect && window.innerHeight - rect.bottom > 380 ? 'below' : 'above'
  open.value = true
  nextTick(focusActiveDay)
}

function closeCalendar() {
  open.value = false
}

function toggleCalendar() {
  open.value ? closeCalendar() : openCalendar()
}

watch(open, (v) => {
  offEsc?.()
  offEsc = v ? pushEscHandler(closeCalendar) : null
})
onUnmounted(() => offEsc?.())

useClickOutside(rootEl, closeCalendar, () => open.value)

/* ---------------- 日历视图 ---------------- */

type Mode = 'days' | 'months' | 'years'
const mode = ref<Mode>('days')
const view = ref({ y: today().getFullYear(), m: today().getMonth() })
const focusedIso = ref(todayIso)

const monthLabel = computed(() => `${view.value.y}年${view.value.m + 1}月`)
const maxYear = computed(() => parseIso(maxIso.value).getFullYear())

/** 可导航的月份边界（含 max 上限与 10 年下限） */
const canPrevMonth = computed(() => {
  const min = { y: MIN_YEAR, m: 0 }
  return view.value.y > min.y || (view.value.y === min.y && view.value.m > min.m)
})
const canNextMonth = computed(() => {
  const max = parseIso(maxIso.value)
  return view.value.y < max.getFullYear() || (view.value.y === max.getFullYear() && view.value.m < max.getMonth())
})
const canPrevYear = computed(() => view.value.y > MIN_YEAR)
const canNextYear = computed(() => view.value.y < maxYear.value)

function shiftMonth(delta: number) {
  const d = new Date(view.value.y, view.value.m + delta, 1)
  view.value = { y: d.getFullYear(), m: d.getMonth() }
  nextTick(focusActiveDay)
}
function prevMonth() {
  if (canPrevMonth.value) shiftMonth(-1)
}
function nextMonth() {
  if (canNextMonth.value) shiftMonth(1)
}
function shiftYear(delta: number) {
  view.value = { y: view.value.y + delta, m: view.value.m }
  nextTick(focusActiveMonth)
}
function prevYear() {
  if (canPrevYear.value) shiftYear(-1)
}
function nextYear() {
  if (canNextYear.value) shiftYear(1)
}

interface DayCell {
  iso: string
  day: number
  disabled: boolean
}

const days = computed<DayCell[]>(() => {
  const count = new Date(view.value.y, view.value.m + 1, 0).getDate()
  const list: DayCell[] = []
  for (let i = 1; i <= count; i++) {
    const d = new Date(view.value.y, view.value.m, i)
    const iso = isoOf(d)
    list.push({ iso, day: i, disabled: iso > maxIso.value })
  }
  return list
})

const leadingBlanks = computed(() => {
  const first = new Date(view.value.y, view.value.m, 1)
  return (first.getDay() + 6) % 7 // 周一开头
})

const activeIso = computed(() => {
  if (props.modelValue) return props.modelValue
  const inView = `${view.value.y}-${String(view.value.m + 1).padStart(2, '0')}`
  if (focusedIso.value.startsWith(inView)) return focusedIso.value
  return days.value.find((d) => !d.disabled)?.iso ?? todayIso
})

interface MonthCell {
  m: number
  label: string
  disabled: boolean
  isCurrent: boolean
}

const monthCells = computed<MonthCell[]>(() => {
  const max = parseIso(maxIso.value)
  return Array.from({ length: 12 }, (_, i) => ({
    m: i,
    label: `${i + 1}月`,
    disabled:
      view.value.y > max.getFullYear() ||
      (view.value.y === max.getFullYear() && i > max.getMonth()) ||
      view.value.y < MIN_YEAR,
    isCurrent: view.value.y === today().getFullYear() && i === today().getMonth(),
  }))
})

function select(iso: string) {
  emit('update:modelValue', iso)
  closeCalendar()
}

const quick = computed(() => {
  const mk = (offset: number) => {
    const d = today()
    d.setDate(d.getDate() - offset)
    return isoOf(d)
  }
  return [
    { label: '今天', value: mk(0) },
    { label: '昨天', value: mk(1) },
    { label: '前天', value: mk(2) },
  ]
})

/* ---------------- 两级切换 ---------------- */

function showMonths() {
  mode.value = 'months'
  nextTick(focusActiveMonth)
}

function pickMonth(m: number) {
  view.value = { y: view.value.y, m }
  mode.value = 'days'
  nextTick(focusActiveDay)
}

/* 年份宫格：12 年一窗，围绕当前年份居中 */
const yearsWindow = ref(0)

const yearCells = computed(() => {
  const list: { y: number; disabled: boolean; isCurrent: boolean; isSelected: boolean }[] = []
  for (let i = 0; i < 12; i++) {
    const y = yearsWindow.value + i
    list.push({
      y,
      disabled: y > maxYear.value || y < MIN_YEAR,
      isCurrent: y === today().getFullYear(),
      isSelected: !!props.modelValue?.startsWith(`${y}-`),
    })
  }
  return list
})

const windowLabel = computed(() => `${yearsWindow.value} – ${yearsWindow.value + 11}`)
const canPrevYears = computed(() => yearsWindow.value - 12 >= MIN_YEAR)
const canNextYears = computed(() => yearsWindow.value + 12 <= maxYear.value)

function showYears() {
  const maxY = maxYear.value
  yearsWindow.value = Math.min(Math.max(view.value.y - 5, MIN_YEAR), maxY - 11)
  mode.value = 'years'
  nextTick(focusActiveYear)
}

function pickYear(y: number) {
  view.value = { y, m: view.value.m }
  mode.value = 'months'
  nextTick(focusActiveMonth)
}

function shiftYears(delta: number) {
  yearsWindow.value += delta
  nextTick(focusActiveYear)
}

function focusDay(iso: string) {
  focusedIso.value = iso
  nextTick(() => {
    rootEl.value?.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`)?.focus()
  })
}

function focusActiveDay() {
  focusDay(activeIso.value)
}

function focusActiveMonth() {
  rootEl.value?.querySelector<HTMLButtonElement>(`[data-month="${view.value.m}"]`)?.focus()
}

function focusActiveYear() {
  rootEl.value?.querySelector<HTMLButtonElement>(`[data-year="${view.value.y}"]`)?.focus()
}

/* ---------------- 键盘导航 ---------------- */

const DAY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
const MONTH_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }
const YEAR_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }

function onDaysKeydown(e: KeyboardEvent) {
  const iso = (e.target as HTMLElement).dataset.day
  if (!iso) return
  let next: Date | null = null
  if (e.key in DAY_STEP) {
    const d = parseIso(iso)
    d.setDate(d.getDate() + DAY_STEP[e.key]!)
    next = d
  } else if (e.key === 'Home') {
    const d = parseIso(iso)
    next = new Date(d.getFullYear(), d.getMonth(), 1)
  } else if (e.key === 'End') {
    const d = parseIso(iso)
    next = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  } else if (e.key === 'PageDown' || e.key === 'PageUp') {
    const d = parseIso(iso)
    next = new Date(d.getFullYear(), d.getMonth() + (e.key === 'PageDown' ? 1 : -1), 1)
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    select(iso)
    return
  } else {
    return
  }
  e.preventDefault()
  const nextIso = isoOf(next)
  if (nextIso > maxIso.value) return
  const vm = { y: next.getFullYear(), m: next.getMonth() }
  if (vm.y !== view.value.y || vm.m !== view.value.m) view.value = vm
  focusDay(nextIso)
}

function onMonthsKeydown(e: KeyboardEvent) {
  const cur = Number((e.target as HTMLElement).dataset.month)
  if (Number.isNaN(cur)) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    pickMonth(cur)
    return
  }
  if (!(e.key in MONTH_STEP)) return
  e.preventDefault()
  const m = cur + MONTH_STEP[e.key]!
  if (m < 0 || m > 11) return
  const cell = monthCells.value[m]!
  if (cell.disabled) return
  nextTick(() => {
    rootEl.value?.querySelector<HTMLButtonElement>(`[data-month="${m}"]`)?.focus()
  })
}

function onYearsKeydown(e: KeyboardEvent) {
  const cur = Number((e.target as HTMLElement).dataset.year)
  if (Number.isNaN(cur)) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    pickYear(cur)
    return
  }
  if (!(e.key in YEAR_STEP)) return
  e.preventDefault()
  const y = cur + YEAR_STEP[e.key]!
  const cell = yearCells.value.find((c) => c.y === y)
  if (!cell || cell.disabled) return
  nextTick(() => {
    rootEl.value?.querySelector<HTMLButtonElement>(`[data-year="${y}"]`)?.focus()
  })
}
</script>

<template>
  <div ref="rootEl" class="date-field">
    <button
      ref="triggerEl"
      type="button"
      class="control state-layer"
      :class="{ focused: open }"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggleCalendar"
    >
      <AppIcon name="calendar" :size="18" class="lead" aria-hidden="true" />
      <span class="text">
        <span class="label">{{ label }}</span>
        <span class="value">{{ display }}</span>
      </span>
      <AppIcon name="chevron-down" :size="16" class="trail" aria-hidden="true" />
    </button>

    <Transition name="cal">
      <div
        v-if="open"
        class="calendar"
        :class="`placement-${placement}`"
        role="dialog"
        aria-label="选择日期"
      >
        <!-- 年份宫格 -->
        <template v-if="mode === 'years'">
          <header class="cal-head">
            <IconButton icon="chevron-left" label="往前十二年" variant="standard" size="sm" :disabled="!canPrevYears" @click="shiftYears(-12)" />
            <strong class="cal-month">{{ windowLabel }} 年</strong>
            <IconButton icon="chevron-right" label="往后十二年" variant="standard" size="sm" :disabled="!canNextYears" @click="shiftYears(12)" />
          </header>
          <div class="cal-years" @keydown="onYearsKeydown">
            <button
              v-for="c in yearCells"
              :key="c.y"
              type="button"
              class="cal-year-cell state-layer"
              :class="{ current: c.isCurrent, selected: c.isSelected }"
              :data-year="c.y"
              :disabled="c.disabled"
              :tabindex="c.y === view.y ? 0 : -1"
              :aria-label="`${c.y}年${c.isCurrent ? '（今年）' : ''}`"
              @click="pickYear(c.y)"
            >
              {{ c.y }}
            </button>
          </div>
        </template>

        <!-- 年月面板 -->
        <template v-else-if="mode === 'months'">
          <header class="cal-head">
            <IconButton icon="chevron-left" label="上一年" variant="standard" size="sm" :disabled="!canPrevYear" @click="prevYear" />
            <button
              type="button"
              class="cal-month-btn state-layer"
              aria-label="选择年份"
              @click="showYears"
            >
              {{ view.y }}年
              <AppIcon name="chevron-down" :size="14" aria-hidden="true" />
            </button>
            <IconButton icon="chevron-right" label="下一年" variant="standard" size="sm" :disabled="!canNextYear" @click="nextYear" />
          </header>
          <div class="cal-months" @keydown="onMonthsKeydown">
            <button
              v-for="c in monthCells"
              :key="c.m"
              type="button"
              class="cal-month-cell state-layer"
              :class="{ current: c.isCurrent }"
              :data-month="c.m"
              :disabled="c.disabled"
              :tabindex="c.m === view.m ? 0 : -1"
              :aria-label="`${view.y}年${c.label}${c.isCurrent ? '（当前月）' : ''}`"
              @click="pickMonth(c.m)"
            >
              {{ c.label }}
            </button>
          </div>
        </template>

        <!-- 日视图 -->
        <template v-else>
          <header class="cal-head">
            <IconButton icon="chevron-left" label="上个月" variant="standard" size="sm" :disabled="!canPrevMonth" @click="prevMonth" />
            <button
              type="button"
              class="cal-month-btn state-layer"
              aria-label="选择年月"
              :aria-expanded="false"
              @click="showMonths"
            >
              {{ monthLabel }}
              <AppIcon name="chevron-down" :size="14" aria-hidden="true" />
            </button>
            <IconButton icon="chevron-right" label="下个月" variant="standard" size="sm" :disabled="!canNextMonth" @click="nextMonth" />
          </header>

          <div class="cal-week" aria-hidden="true">
            <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
          </div>

          <div class="cal-grid" @keydown="onDaysKeydown">
            <span v-for="n in leadingBlanks" :key="`b-${n}`" class="cal-blank" aria-hidden="true" />
            <button
              v-for="d in days"
              :key="d.iso"
              type="button"
              class="cal-day"
              :class="{
                selected: d.iso === modelValue,
                today: d.iso === todayIso,
              }"
              :data-day="d.iso"
              :disabled="d.disabled"
              :tabindex="d.iso === activeIso ? 0 : -1"
              :aria-pressed="d.iso === modelValue"
              :aria-label="`${view.m + 1}月${d.day}日${d.iso === todayIso ? '（今天）' : ''}`"
              @click="select(d.iso)"
            >
              {{ d.day }}
            </button>
          </div>
        </template>

        <footer class="cal-quick">
          <button
            v-for="q in quick"
            :key="q.value"
            type="button"
            class="quick-btn state-layer"
            :class="{ active: modelValue === q.value }"
            @click="select(q.value)"
          >
            {{ q.label }}
          </button>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.date-field {
  position: relative;
  min-width: 0;
}

.control {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-medium);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-short) var(--ease-standard);
}
.control:hover {
  background: var(--color-surface-container-highest);
}
.control.focused {
  box-shadow: inset 0 0 0 1.5px var(--color-primary);
}

.lead {
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
}
.text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.label {
  font: var(--type-label-small-size) / 1.3 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.value {
  font: var(--type-body-large-size) / 1.4 var(--font-sans);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trail {
  color: var(--color-on-surface-variant);
  flex-shrink: 0;
  transition: transform var(--motion-short) var(--ease-standard);
}
.control[aria-expanded="true"] .trail {
  transform: rotate(180deg);
}

/* ---------------- 日历浮层 ---------------- */
.calendar {
  position: absolute;
  left: 0;
  z-index: var(--z-tooltip);
  width: 300px;
  max-width: calc(100vw - 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface-container-high);
  border-radius: var(--radius-large);
  box-shadow: var(--elevation-level-2);
  border: 1px solid var(--color-outline-variant);
}
.placement-below {
  top: calc(100% + 6px);
}
.placement-above {
  bottom: calc(100% + 6px);
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 32px;
}
.cal-month {
  font: var(--type-title-small-size) / 1.4 var(--font-sans);
  font-weight: var(--type-title-small-weight);
}
.cal-month-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  color: var(--color-on-surface);
  font: var(--type-title-small-size) / 1.4 var(--font-sans);
  font-weight: var(--type-title-small-weight);
}

.cal-week,
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-week span {
  text-align: center;
  font: var(--type-label-small-size) / 1.6 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.cal-blank {
  min-height: 34px;
}

.cal-day {
  height: 34px;
  border-radius: var(--radius-full);
  font: var(--type-label-large-size) / 1 var(--font-sans);
  color: var(--color-on-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background-color var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .cal-day:not(:disabled):hover {
    background: var(--color-surface-container-highest);
  }
}
.cal-day:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}
.cal-day.today:not(.selected)::after {
  content: "";
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
}
.cal-day.selected {
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
}

/* 年月宫格 */
.cal-months {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
}
.cal-month-cell {
  height: 40px;
  border-radius: var(--radius-medium);
  font: var(--type-label-large-size) / 1 var(--font-sans);
  color: var(--color-on-surface);
  transition: background-color var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .cal-month-cell:not(:disabled):hover {
    background: var(--color-surface-container-highest);
  }
}
.cal-month-cell:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}
.cal-month-cell.current {
  color: var(--color-primary);
  font-weight: 650;
}

/* 年份宫格 */
.cal-years {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
}
.cal-year-cell {
  height: 40px;
  border-radius: var(--radius-medium);
  font: var(--type-label-large-size) / 1 var(--font-sans);
  color: var(--color-on-surface);
  transition: background-color var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .cal-year-cell:not(:disabled):hover {
    background: var(--color-surface-container-highest);
  }
}
.cal-year-cell:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}
.cal-year-cell.current {
  color: var(--color-primary);
  font-weight: 650;
}
.cal-year-cell.selected {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-weight: 600;
}

.cal-quick {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
}
.quick-btn {
  flex: 1;
  height: 32px;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
  font: var(--type-label-medium-size) / 1 var(--font-sans);
  transition:
    background-color var(--motion-short) var(--ease-standard),
    color var(--motion-short) var(--ease-standard);
}
.quick-btn.active {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}

/* 进出场：自触发点缩放淡入 */
.cal-enter-active,
.cal-leave-active {
  transition:
    opacity var(--motion-short) var(--ease-standard),
    transform var(--motion-short) var(--ease-emphasized-decelerate);
  transform-origin: top left;
}
.calendar.placement-above.cal-enter-active,
.calendar.placement-above.cal-leave-active {
  transform-origin: bottom left;
}
.cal-enter-from,
.cal-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(4px);
}
</style>
