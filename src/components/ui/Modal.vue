<script setup lang="ts">
/**
 * Modal — 居中对话框（Tablet 默认弹层形态）
 * scrim 点击 / Esc 关闭；焦点圈定；aria-modal。
 */
import { computed, ref, watch } from 'vue'
import { useFocusTrap } from '../../composables/useMisc'
import { useScrollLock } from '../../composables/useOverlay'
import IconButton from './IconButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const emit = defineEmits<{ close: [] }>()

const container = useFocusTrap(
  computed(() => props.open),
  () => emit('close'),
)
useScrollLock(computed(() => props.open))

const localRef = ref<HTMLElement | null>(null)
watch(container, (el) => {
  localRef.value = el
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-root">
        <div class="scrim" aria-hidden="true" @click="emit('close')" />
        <div
          ref="container"
          class="dialog"
          :class="`size-${size}`"
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
.modal-root {
  position: fixed;
  inset: 0;
  z-index: var(--z-sheet);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}

.scrim {
  position: absolute;
  inset: 0;
  background: var(--color-scrim);
  opacity: 1;
  transition: opacity var(--motion-medium) var(--ease-standard);
}
.modal-enter-active .scrim,
.modal-leave-active .scrim {
  transition: opacity var(--motion-medium) var(--ease-standard);
}
.modal-enter-from .scrim,
.modal-leave-to .scrim {
  opacity: 0 !important;
}

.dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: min(85dvh, 720px);
  width: 100%;
  border-radius: var(--radius-extra-large);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  box-shadow: var(--elevation-level-3);
  opacity: 1;
  transition: opacity var(--motion-medium) var(--ease-standard);
}
.size-sm { max-width: 400px; }
.size-md { max-width: 560px; }
.size-lg { max-width: 720px; }

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5) 0;
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
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-outline-variant);
}

/* 进出场：缩放 + 上浮（M3 emphasized） */
.modal-enter-active .dialog,
.modal-leave-active .dialog {
  transition:
    transform var(--motion-medium) var(--ease-emphasized-decelerate),
    opacity var(--motion-medium) var(--ease-standard);
}
.modal-enter-from .dialog,
.modal-leave-to .dialog {
  transform: scale(0.94) translateY(12px);
  opacity: 0;
}
</style>
