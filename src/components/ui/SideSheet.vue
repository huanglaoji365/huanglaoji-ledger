<script setup lang="ts">
/**
 * SideSheet — 右侧抽屉（Desktop 记账 / 详情形态）
 * 从右侧滑入，带 scrim，Esc / 点击遮罩关闭。
 */
import { computed } from 'vue'
import { useFocusTrap } from '../../composables/useMisc'
import { useScrollLock } from '../../composables/useOverlay'
import IconButton from './IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    width?: number
  }>(),
  { width: 480 },
)

const emit = defineEmits<{ close: [] }>()

const container = useFocusTrap(
  computed(() => props.open),
  () => emit('close'),
)
useScrollLock(computed(() => props.open))
</script>

<template>
  <Teleport to="body">
    <Transition name="side">
      <div v-if="open" class="side-root">
        <div class="scrim" aria-hidden="true" @click="emit('close')" />
        <div
          ref="container"
          class="panel"
          :style="{ width: `min(${width}px, 92vw)` }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <header class="head">
            <h2 class="title">{{ title }}</h2>
            <IconButton icon="close" label="关闭" variant="standard" size="sm" @click="emit('close')" />
          </header>
          <div class="body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.side-root {
  position: fixed;
  inset: 0;
  z-index: var(--z-sheet);
  display: flex;
  justify-content: flex-end;
}

.scrim {
  position: absolute;
  inset: 0;
  background: var(--color-scrim);
}

.panel {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-container-low);
  color: var(--color-on-surface);
  border-radius: 0;
  box-shadow: var(--elevation-level-3);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6) var(--space-3);
  border-bottom: 1px solid var(--color-outline-variant);
}
.title {
  font: var(--type-title-large-size) / var(--type-title-large-line-height) var(--font-sans);
  font-weight: var(--type-title-large-weight);
}
.body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  scrollbar-width: thin;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-outline-variant);
}

.side-enter-active .panel,
.side-leave-active .panel {
  transition: transform var(--motion-long) var(--ease-emphasized-decelerate);
}
.side-enter-from .panel,
.side-leave-to .panel {
  transform: translateX(100%);
}
.side-enter-active .scrim,
.side-leave-active .scrim {
  transition: opacity var(--motion-medium) var(--ease-standard);
}
.side-enter-from .scrim,
.side-leave-to .scrim {
  opacity: 0;
}
</style>
