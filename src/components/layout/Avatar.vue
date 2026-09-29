<script setup lang="ts">
/**
 * Avatar — 用户头像
 * 有 src（data URL）时显示图片，否则显示名称首字符。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    src?: string
    size?: number
  }>(),
  { size: 36 },
)

const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '?')
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.42)}px` }"
    aria-hidden="true"
  >
    <img v-if="src" :src="src" alt="" />
    <template v-else>{{ initial }}</template>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-weight: 650;
  flex-shrink: 0;
  overflow: hidden;
  user-select: none;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
