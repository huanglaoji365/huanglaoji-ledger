<script setup lang="ts">
/**
 * FloatingActionButton — 悬浮操作按钮（记一笔）
 * extended: 带文字的扩展形态；size 控制主尺寸。
 * Mobile 固定悬浮于底部导航上方（由 AppShell 定位）。
 */
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    extended?: boolean
    label?: string
    size?: 'md' | 'lg'
  }>(),
  { icon: 'plus', extended: false, label: '记一笔', size: 'lg' },
)

const emit = defineEmits<{ click: [e: MouseEvent] }>()
</script>

<template>
  <button
    class="fab state-layer"
    :class="{ extended, [`size-${size}`]: true }"
    :aria-label="extended ? undefined : label"
    @click="emit('click', $event)"
  >
    <AppIcon :name="icon" :size="extended ? 22 : 24" />
    <span v-if="extended" class="label">{{ label }}</span>
  </button>
</template>

<style scoped>
.fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  border-radius: var(--radius-large);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  box-shadow: var(--elevation-level-1);
  transition:
    box-shadow var(--motion-short) var(--ease-standard),
    transform var(--motion-short) var(--ease-emphasized-decelerate);
}
.fab:hover {
  box-shadow: var(--elevation-level-2);
}
.fab:active {
  transform: scale(0.96);
}

.size-md {
  width: 48px;
  height: 48px;
}
.size-lg {
  width: 56px;
  height: 56px;
}
.extended.size-lg {
  width: auto;
  height: 56px;
  padding: 0 var(--space-5);
}
.label {
  font: var(--type-label-large-size) / 1 var(--font-sans);
  font-weight: var(--type-label-large-weight);
  white-space: nowrap;
  padding-right: var(--space-1);
}

@media (max-width: 599.98px) {
  .fab {
    border-radius: var(--radius-medium);
  }
}
</style>
