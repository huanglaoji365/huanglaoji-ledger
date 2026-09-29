<script setup lang="ts">
/**
 * App — 组合根：路由 + 布局分支（业务页 AppShell / 登录页独立）+ 全局弹层
 * 登录用户的主题偏好随账号保存与恢复。
 */
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from './components/layout/AppShell.vue'
import AddTransactionSheet from './components/finance/AddTransactionSheet.vue'
import SnackbarHost from './components/ui/SnackbarHost.vue'
import { useAuth } from './composables/useAuth'
import { useUi, type ThemeMode } from './composables/useUi'

const route = useRoute()
const auth = useAuth()
const ui = useUi()

// 登录状态下，主题 / 主题色变更随用户档案保存
watch(
  () => [ui.state.theme, ui.state.hue] as const,
  ([theme, hue]) => {
    auth.savePrefs({ theme, hue } satisfies { theme: ThemeMode; hue: number })
  },
)
</script>

<template>
  <AppShell v-if="!route.meta.public">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </AppShell>

  <RouterView v-else v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>

  <AddTransactionSheet />
  <SnackbarHost />
</template>

<style scoped>
/* 页面切换：轻微上浮淡入（Material 3 Expressive，快速自然） */
.page-enter-active {
  transition:
    opacity var(--motion-medium) var(--ease-standard),
    transform var(--motion-medium) var(--ease-emphasized-decelerate);
}
.page-leave-active {
  transition:
    opacity var(--motion-short) var(--ease-standard),
    transform var(--motion-short) var(--ease-standard);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
