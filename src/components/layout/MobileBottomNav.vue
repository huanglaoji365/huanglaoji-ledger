<script setup lang="ts">
/**
 * MobileBottomNav — Mobile 底部导航（<600px）
 * 信息架构重组：主 4 项 + 「更多」抽屉承载次级目的地；
 * 避让安全区；aria-current 标记当前页。
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NAV_ITEMS } from './navigation'
import AppIcon from '../ui/AppIcon.vue'
import BottomSheet from '../ui/BottomSheet.vue'

const route = useRoute()
const moreOpen = ref(false)

const primaryItems = computed(() => NAV_ITEMS.filter((i) => i.primary))
const secondaryItems = computed(() => NAV_ITEMS.filter((i) => !i.primary))

const isActive = (r: string) =>
  r === '/' ? route.path === '/' : route.path.startsWith(r)
</script>

<template>
  <nav class="bottom-nav safe-bottom" aria-label="底部导航">
    <ul>
      <li v-for="item in primaryItems" :key="item.route">
        <RouterLink
          :to="item.route"
          class="tab"
          :class="{ active: isActive(item.route) }"
          :aria-current="isActive(item.route) ? 'page' : undefined"
        >
          <span class="pill">
            <AppIcon :name="item.icon" :size="22" />
          </span>
          <span class="label">{{ item.label }}</span>
        </RouterLink>
      </li>
      <li>
        <button
          class="tab"
          :class="{ active: secondaryItems.some((i) => isActive(i.route)) }"
          :aria-expanded="moreOpen"
          aria-haspopup="dialog"
          @click="moreOpen = true"
        >
          <span class="pill">
            <AppIcon name="grid" :size="22" />
          </span>
          <span class="label">更多</span>
        </button>
      </li>
    </ul>

    <BottomSheet :open="moreOpen" title="更多" @close="moreOpen = false">
      <ul class="more-list">
        <li v-for="item in secondaryItems" :key="item.route">
          <RouterLink
            :to="item.route"
            class="more-item state-layer"
            :class="{ active: isActive(item.route) }"
            @click="moreOpen = false"
          >
            <span class="more-icon" aria-hidden="true">
              <AppIcon :name="item.icon" :size="20" />
            </span>
            <span>{{ item.label }}</span>
            <AppIcon name="chevron-right" :size="18" class="chevron" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
    </BottomSheet>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: var(--z-nav);
  background: var(--color-surface-container);
  border-top: 1px solid var(--color-outline-variant);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

ul {
  display: flex;
  align-items: stretch;
}

li {
  flex: 1;
  min-width: 0;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
  padding: var(--space-2) 0 var(--space-3);
  color: var(--color-on-surface-variant);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 32px;
  border-radius: var(--radius-full);
  transition: background-color var(--motion-medium) var(--ease-emphasized-decelerate);
}
.tab.active {
  color: var(--color-on-secondary-container);
}
.tab.active .pill {
  background: var(--color-secondary-container);
}

.label {
  font: var(--type-label-small-size) / 1.2 var(--font-sans);
  font-weight: var(--type-label-small-weight);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 var(--space-1);
}

/* 更多抽屉内容 */
.more-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.more-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-2);
  border-radius: var(--radius-medium);
  color: var(--color-on-surface);
  text-decoration: none;
  font: var(--type-body-large-size) / var(--type-body-large-line-height) var(--font-sans);
}
.more-item.active {
  color: var(--color-primary);
  font-weight: 550;
}
.more-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
}
.more-item.active .more-icon {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}
.chevron {
  margin-left: auto;
  color: var(--color-on-surface-variant);
}
</style>
