<script setup lang="ts">
/**
 * AppSidebar — Desktop 侧边栏（≥1024px）
 * 品牌 + 完整导航 + 账户净资产摘要。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NAV_ITEMS } from './navigation'
import { useLedger } from '../../composables/useLedger'
import { formatAmount } from '../../data/format'
import BrandMark from './BrandMark.vue'
import AppIcon from '../ui/AppIcon.vue'

const route = useRoute()
const { netWorth } = useLedger()

const isActive = (r: string) =>
  r === '/' ? route.path === '/' : route.path.startsWith(r)

const netWorthText = computed(() => formatAmount(netWorth.value))
</script>

<template>
  <aside class="sidebar">
    <div class="brand-row">
      <BrandMark />
    </div>

    <nav class="nav" aria-label="主导航">
      <ul>
        <li v-for="item in NAV_ITEMS" :key="item.route">
          <RouterLink
            :to="item.route"
            class="nav-item state-layer"
            :class="{ active: isActive(item.route) }"
            :aria-current="isActive(item.route) ? 'page' : undefined"
          >
            <span class="pill">
              <AppIcon :name="item.icon" :size="20" />
            </span>
            <span class="label">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="footer">
      <div class="net-worth" role="group" aria-label="净资产">
        <AppIcon name="trend-up" :size="16" aria-hidden="true" />
        <span class="nw-label">净资产</span>
        <strong class="numeric">{{ netWorthText }}</strong>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--shell-sidebar-width);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-4);
  background: var(--color-surface-container-low);
  border-right: 1px solid var(--color-outline-variant);
  z-index: var(--z-nav);
  overflow-y: auto;
  scrollbar-width: thin;
}

.brand-row {
  padding: 0 var(--space-2);
}

.nav {
  flex: 1;
}
.nav ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1);
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
  text-decoration: none;
  font: var(--type-label-large-size) / var(--type-label-large-line-height) var(--font-sans);
  font-weight: var(--type-label-large-weight);
  transition: color var(--motion-short) var(--ease-standard);
}
.nav-item:hover {
  color: var(--color-on-surface);
}
.nav-item.active {
  color: var(--color-on-secondary-container);
}

.pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 40px;
  border-radius: var(--radius-full);
  transition: background-color var(--motion-medium) var(--ease-emphasized-decelerate);
  flex-shrink: 0;
}
.nav-item.active .pill {
  background: var(--color-secondary-container);
}

.label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer {
  border-top: 1px solid var(--color-outline-variant);
  padding-top: var(--space-4);
}
.net-worth {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-medium);
  background: var(--color-surface-container);
  color: var(--color-on-surface-variant);
  font: var(--type-body-small-size) / 1.4 var(--font-sans);
}
.net-worth strong {
  margin-left: auto;
  font-size: var(--type-title-small-size);
  font-weight: 650;
  color: var(--color-on-surface);
}
</style>
