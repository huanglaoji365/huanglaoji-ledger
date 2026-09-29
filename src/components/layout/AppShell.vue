<script setup lang="ts">
/**
 * AppShell — 应用外壳（响应式导航编排）
 * Desktop ≥1024 : Sidebar + 内容（无 TopBar）
 * Tablet 600–1023: NavigationRail + TopBar + 内容
 * Mobile <600    : TopBar + 内容 + BottomNav + 悬浮 FAB
 * 全端共享 FAB「记一笔」入口。
 */
import { useBreakpoints } from '../../composables/useBreakpoint'
import { useUi } from '../../composables/useUi'
import AppSidebar from './AppSidebar.vue'
import NavigationRail from './NavigationRail.vue'
import MobileBottomNav from './MobileBottomNav.vue'
import TopBar from './TopBar.vue'
import Fab from '../ui/Fab.vue'

const { mobile, desktop } = useBreakpoints()
const { openAddSheet } = useUi()
</script>

<template>
  <div class="shell" :class="{ 'with-rail': !mobile && !desktop, 'with-sidebar': desktop }">
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <!-- STEP 7 Desktop Sidebar -->
    <AppSidebar v-if="desktop" />

    <!-- STEP 8 Tablet Navigation Rail -->
    <NavigationRail v-else-if="!mobile" />

    <div class="main-area">
      <!-- STEP 9 Mobile & Tablet TopBar -->
      <TopBar v-if="!desktop" />

      <main id="main-content" class="content" tabindex="-1">
        <slot />
      </main>
    </div>

    <!-- STEP 9 Mobile Bottom Navigation -->
    <MobileBottomNav v-if="mobile" />

    <!-- 全局记账入口 -->
    <Fab
      class="global-fab"
      :extended="desktop"
      label="记一笔"
      :aria-label="desktop ? undefined : '记一笔'"
      @click="openAddSheet"
    />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
}

.main-area {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.content {
  flex: 1;
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-4) var(--space-4) calc(var(--shell-bottomnav-height) + env(safe-area-inset-bottom, 0px) + var(--space-12));
}
.content:focus {
  outline: none;
}

/* Tablet */
.with-rail .main-area {
  margin-left: var(--shell-rail-width);
}
.with-rail .content {
  padding-top: var(--space-6);
  padding-bottom: var(--space-12);
}

/* Desktop */
.with-sidebar .main-area {
  margin-left: var(--shell-sidebar-width);
}
.with-sidebar .content {
  padding: var(--space-8) var(--space-8) var(--space-12);
}
@media (min-width: 1440px) {
  .with-sidebar .content {
    padding: var(--space-10) var(--space-12) var(--space-16);
  }
}

.global-fab {
  position: fixed;
  z-index: var(--z-fab);
  right: var(--space-4);
  bottom: calc(var(--shell-bottomnav-height) + env(safe-area-inset-bottom, 0px) + var(--space-4));
}
.with-rail .global-fab {
  bottom: var(--space-6);
}
.with-sidebar .global-fab {
  bottom: var(--space-8);
  right: var(--space-8);
}
@media (min-width: 1440px) {
  .with-sidebar .global-fab {
    right: var(--space-12);
  }
}

@media (max-width: 599.98px) {
  .content {
    padding-top: var(--space-4);
  }
}
@media (min-width: 600px) and (max-width: 1023.98px) {
  .content {
    padding-left: var(--space-6);
    padding-right: var(--space-6);
  }
}
</style>
