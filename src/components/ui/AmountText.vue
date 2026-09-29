<script setup lang="ts">
/**
 * AmountText — 金额自适应文本
 * 按字符长度自动降字号（1em → 0.66em），超长时省略号兜底，
 * title 悬浮查看完整值。父级通过 font-size 控制基准大小。
 */
import { computed } from 'vue'

const props = defineProps<{
  text: string
}>()

const sizeClass = computed(() => {
  const len = props.text.length
  if (len <= 9) return 's100'
  if (len <= 12) return 's90'
  if (len <= 15) return 's78'
  return 's66'
})
</script>

<template>
  <span class="amount-text numeric" :class="sizeClass" :title="text">{{ text }}</span>
</template>

<style scoped>
.amount-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.s100 { font-size: 1em; }
.s90 { font-size: 0.9em; letter-spacing: -0.2px; }
.s78 { font-size: 0.78em; letter-spacing: -0.3px; }
.s66 { font-size: 0.66em; letter-spacing: -0.3px; }
</style>
