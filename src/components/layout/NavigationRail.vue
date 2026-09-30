<script setup lang="ts">
/**
 * NavigationRail — Tablet 导航栏（600–1023px）
 * 图标堆叠式导航；选中态为 M3 药丸指示器。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { visibleNavItems } from './navigation'
import { useAuth } from '../../composables/useAuth'
import BrandMark from './BrandMark.vue'
import AppIcon from '../ui/AppIcon.vue'

const route = useRoute()
const { state: authState } = useAuth()
const navItems = computed(() => visibleNavItems(authState.session?.role))

const isActive = (r: string) =>
  r === '/' ? route.path === '/' : route.path.startsWith(r)
</script>

<template>
  <aside class="rail">
    <div class="brand-row">
      <BrandMark compact />
    </div>

    <nav class="nav" aria-label="主导航">
      <ul>
        <li v-for="item in navItems" :key="item.route">
          <RouterLink
            :to="item.route"
            class="rail-item"
            :class="{ active: isActive(item.route) }"
            :aria-current="isActive(item.route) ? 'page' : undefined"
            :aria-label="item.label"
            :title="item.label"
          >
            <span class="pill">
              <AppIcon :name="item.icon" :size="22" />
            </span>
            <span class="label">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.rail {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--shell-rail-width);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-3);
  background: var(--color-surface-container-low);
  border-right: 1px solid var(--color-outline-variant);
  z-index: var(--z-nav);
  overflow-y: auto;
  scrollbar-width: none;
}

.brand-row {
  padding-bottom: var(--space-2);
}

.nav ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) 0;
  border-radius: var(--radius-medium);
  color: var(--color-on-surface-variant);
  text-decoration: none;
  width: 72px;
}

.pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 32px;
  border-radius: var(--radius-full);
  transition: background-color var(--motion-medium) var(--ease-emphasized-decelerate);
}
.rail-item.active {
  color: var(--color-on-secondary-container);
}
.rail-item.active .pill {
  background: var(--color-secondary-container);
}
.rail-item:hover .pill {
  background: var(--color-surface-container-high);
}
.rail-item.active:hover .pill {
  background: var(--color-secondary-container);
}

.label {
  font: var(--type-label-small-size) / 1.2 var(--font-sans);
  font-weight: var(--type-label-small-weight);
  white-space: nowrap;
}
</style>
