<script setup lang="ts">
/**
 * SnackbarHost — 全局消息条（aria-live）
 * Mobile: 底部导航上方居中；Desktop: 右下角。
 */
import { onUnmounted, watch } from 'vue'
import { useUi } from '../../composables/useUi'
import AppIcon from './AppIcon.vue'

const { state, dismissToast } = useUi()

const timers = new Map<number, ReturnType<typeof setTimeout>>()
watch(
  () => state.toasts.length,
  () => {
    for (const t of state.toasts) {
      if (!timers.has(t.id)) {
        timers.set(
          t.id,
          setTimeout(() => {
            dismissToast(t.id)
            timers.delete(t.id)
          }, t.duration),
        )
      }
    }
  },
)
onUnmounted(() => timers.forEach((t) => clearTimeout(t)))
</script>

<template>
  <Teleport to="body">
    <div class="snackbar-host" role="status" aria-live="polite">
      <TransitionGroup name="snack">
        <div v-for="t in state.toasts" :key="t.id" class="snackbar">
          <AppIcon name="check-circle" :size="18" aria-hidden="true" />
          <span class="message">{{ t.message }}</span>
          <button class="dismiss" aria-label="关闭提示" @click="dismissToast(t.id)">
            <AppIcon name="close" :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.snackbar-host {
  position: fixed;
  z-index: var(--z-toast);
  bottom: calc(var(--shell-bottomnav-height) + env(safe-area-inset-bottom, 0px) + var(--space-4));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: min(92vw, 480px);
  pointer-events: none;
}

.snackbar {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-medium);
  background: var(--chart-tooltip-bg);
  color: var(--chart-tooltip-fg);
  box-shadow: var(--elevation-level-2);
  font: var(--type-body-medium-size) / var(--type-body-medium-line-height) var(--font-sans);
}

.message {
  flex: 1;
  min-width: 0;
}

.dismiss {
  display: inline-flex;
  padding: var(--space-1);
  border-radius: 50%;
  color: inherit;
  opacity: 0.8;
}
.dismiss:hover {
  opacity: 1;
}

.snack-enter-active,
.snack-leave-active {
  transition:
    transform var(--motion-medium) var(--ease-emphasized-decelerate),
    opacity var(--motion-medium) var(--ease-standard);
}
.snack-enter-from,
.snack-leave-to {
  transform: translateY(16px);
  opacity: 0;
}

@media (min-width: 1024px) {
  .snackbar-host {
    bottom: var(--space-6);
    left: auto;
    right: var(--space-6);
    transform: none;
    width: 400px;
    align-items: flex-end;
  }
  .snackbar {
    width: auto;
    min-width: 320px;
  }
}
</style>
