<script setup lang="ts">
/**
 * TopBar — 顶栏（Mobile / Tablet；Desktop 隐藏）
 * 品牌 + 页面标题 + 动作区（主题切换等）。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PAGE_TITLES } from './navigation'
import { useUi, type ThemeMode } from '../../composables/useUi'
import BrandMark from './BrandMark.vue'
import UserMenu from './UserMenu.vue'
import AppIcon from '../ui/AppIcon.vue'
import AppTooltip from '../ui/AppTooltip.vue'

const route = useRoute()
const { state, setTheme } = useUi()

const title = computed(() => PAGE_TITLES[route.path] ?? '')

const NEXT_THEME: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}
const themeIcon = computed(
  () => ({ system: 'monitor', light: 'sun', dark: 'moon' })[state.theme],
)
const themeLabel = computed(
  () => ({ system: '跟随系统', light: '浅色模式', dark: '深色模式' })[state.theme],
)

const cycleTheme = () => setTheme(NEXT_THEME[state.theme])
</script>

<template>
  <header class="topbar">
    <BrandMark compact class="brand" />
    <Transition name="fade" mode="out-in">
      <h1 :key="title" class="title">{{ title }}</h1>
    </Transition>
    <div class="actions">
      <AppTooltip text="切换主题" position="bottom">
        <button class="theme-btn state-layer" :aria-label="`主题：${themeLabel}，点击切换`" @click="cycleTheme">
          <AppIcon :name="themeIcon" :size="20" />
        </button>
      </AppTooltip>
      <UserMenu variant="icon" />
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-topbar);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--shell-topbar-height);
  padding: 0 var(--space-4);
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-outline-variant);
}

.title {
  flex: 1;
  min-width: 0;
  font: var(--type-title-medium-size) / 1.2 var(--font-sans);
  font-weight: var(--type-title-medium-weight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-on-surface-variant);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--motion-short) var(--ease-standard);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (min-width: 600px) {
  .topbar {
    padding: 0 var(--space-5);
  }
  .brand {
    display: none;
  }
  .title {
    text-align: left;
  }
}
</style>
