<script setup lang="ts">
/**
 * CategoryAvatar — 分类图标（颜色圆底）
 * 颜色之外始终有图标 + 文字（由使用处提供），不单靠颜色传义。
 */
import { computed } from 'vue'
import AppIcon from '../ui/AppIcon.vue'
import type { Category } from '../../data/types'
import { useLedger } from '../../composables/useLedger'

const props = withDefaults(
  defineProps<{
    category: Category | string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const { categoryById } = useLedger()

const cat = computed<Category>(() =>
  typeof props.category === 'string' ? categoryById(props.category) : props.category,
)

const colorVar = computed(() => `var(--chart-color-${cat.value.color})`)

const sizes = { sm: 32, md: 40, lg: 48 }
const px = computed(() => sizes[props.size])
</script>

<template>
  <span
    class="cat-avatar"
    :class="`size-${size}`"
    :style="{
      width: `${px}px`,
      height: `${px}px`,
      background: `color-mix(in srgb, ${colorVar} 16%, transparent)`,
      color: colorVar,
    }"
    aria-hidden="true"
  >
    <AppIcon :name="cat.icon" :size="size === 'sm' ? 16 : size === 'lg' ? 24 : 20" />
  </span>
</template>

<style scoped>
.cat-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
