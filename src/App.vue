<script setup lang="ts">
/**
 * App — 组合根：AppShell + 路由页面 + 全局弹层 / 消息
 */
import { useRoute } from 'vue-router'
import AppShell from './components/layout/AppShell.vue'
import AddTransactionSheet from './components/finance/AddTransactionSheet.vue'
import SnackbarHost from './components/ui/SnackbarHost.vue'

const route = useRoute()
</script>

<template>
  <AppShell>
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </AppShell>

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
