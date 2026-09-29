<script setup lang="ts">
/**
 * BottomSheet — 底部抽屉（Mobile 默认弹层形态）
 * 拖拽条 + 上滑入场 + 安全区适配。
 */
import { computed } from 'vue'
import { useFocusTrap } from '../../composables/useMisc'
import { useScrollLock } from '../../composables/useOverlay'
import IconButton from './IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** 全屏高度比例：'auto' | 'tall' */
    height?: 'auto' | 'tall'
  }>(),
  { height: 'auto' },
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
    <Transition name="sheet">
      <div v-if="open" class="sheet-root">
        <div class="scrim" aria-hidden="true" @click="emit('close')" />
        <div
          ref="container"
          class="panel safe-bottom"
          :class="`height-${height}`"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <div class="grabber" aria-hidden="true" />
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
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: var(--z-sheet);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.scrim {
  position: absolute;
  inset: 0;
  background: var(--color-scrim);
}

.panel {
  position: relative;
  width: 100%;
  max-width: 640px;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  border-radius: var(--radius-extra-large) var(--radius-extra-large) 0 0;
  box-shadow: var(--elevation-level-3);
}
.height-tall {
  height: 92dvh;
}

.grabber {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-outline-variant);
  margin: var(--space-2) auto 0;
  flex-shrink: 0;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-5) 0;
}
.title {
  font: var(--type-title-large-size) / var(--type-title-large-line-height) var(--font-sans);
  font-weight: var(--type-title-large-weight);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.body {
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  scrollbar-width: thin;
}
.footer {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5) var(--space-4);
  border-top: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-high);
}
.footer > :deep(*) {
  flex: 1;
}

/* 进出场：底部上滑 */
.sheet-enter-active .panel,
.sheet-leave-active .panel {
  transition: transform var(--motion-long) var(--ease-emphasized-decelerate);
}
.sheet-enter-from .panel,
.sheet-leave-to .panel {
  transform: translateY(100%);
}
.sheet-enter-active .scrim,
.sheet-leave-active .scrim {
  transition: opacity var(--motion-medium) var(--ease-standard);
}
.sheet-enter-from .scrim,
.sheet-leave-to .scrim {
  opacity: 0;
}
</style>
