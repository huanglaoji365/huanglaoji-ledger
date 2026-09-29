<script setup lang="ts">
/**
 * UserMenu — 用户信息 + 切换账号 / 退出登录
 * variant: chip（Desktop 侧边栏底部） | icon（TopBar 头像按钮）
 * 菜单为浮层：点击外部 / Esc 关闭（Esc 栈保证只关菜单不关页面）。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useUi } from '../../composables/useUi'
import { useClickOutside } from '../../composables/useMisc'
import { pushEscHandler } from '../../composables/useOverlay'
import Avatar from './Avatar.vue'
import AppIcon from '../ui/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'chip' | 'icon'
  }>(),
  { variant: 'chip' },
)

const router = useRouter()
const auth = useAuth()
const ui = useUi()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

let offEsc: (() => void) | null = null

function toggle() {
  open.value = !open.value
}
function close() {
  open.value = false
}

watch(open, (v) => {
  offEsc?.()
  offEsc = v ? pushEscHandler(close) : null
})
onUnmounted(() => offEsc?.())

useClickOutside(rootEl, close, () => open.value)

const displayName = computed(() => auth.state.session?.displayName ?? '未登录')
const username = computed(() => auth.state.session?.username ?? '')
const avatarSrc = computed(() => auth.state.session?.avatar)

function onProfile() {
  close()
  router.push({ name: 'profile' })
}

function onLogout() {
  auth.logout()
  close()
  ui.toast('已退出登录')
  router.push({ name: 'login' })
}
</script>

<template>
  <div ref="rootEl" class="user-menu" :class="`variant-${variant}`">
    <button
      v-if="variant === 'chip'"
      type="button"
      class="chip-btn state-layer"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <Avatar :name="displayName" :src="avatarSrc" :size="32" />
      <span class="chip-text">
        <strong class="truncate">{{ displayName }}</strong>
        <small class="truncate">@{{ username }}</small>
      </span>
      <AppIcon name="chevron-up" :size="16" class="trail" aria-hidden="true" />
    </button>

    <button
      v-else
      type="button"
      class="icon-btn state-layer"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="`账号：${displayName}`"
      @click="toggle"
    >
      <Avatar :name="displayName" :src="avatarSrc" :size="32" />
    </button>

    <Transition name="menu">
      <div v-if="open" class="menu" role="menu" :aria-label="`账号：${displayName}`">
        <div class="menu-head">
          <Avatar :name="displayName" :src="avatarSrc" :size="44" />
          <div class="menu-head-text">
            <strong class="truncate">{{ displayName }}</strong>
            <small class="truncate">@{{ username }}</small>
          </div>
        </div>
        <hr class="menu-divider" />
        <button class="menu-item state-layer" role="menuitem" type="button" @click="onProfile">
          <AppIcon name="user" :size="18" aria-hidden="true" />
          个人信息
        </button>
        <button class="menu-item state-layer danger" role="menuitem" type="button" @click="onLogout">
          <AppIcon name="close" :size="18" aria-hidden="true" />
          退出登录
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
  min-width: 0;
}

/* 触发器：侧边栏 chip */
.chip-btn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-medium);
  color: var(--color-on-surface);
  text-align: left;
}
.chip-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.3;
}
.chip-text strong {
  font: var(--type-label-large-size) / 1.3 var(--font-sans);
  font-weight: 600;
}
.chip-text small {
  font: var(--type-label-small-size) / 1.3 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.trail {
  color: var(--color-on-surface-variant);
  transition: transform var(--motion-short) var(--ease-standard);
}
.chip-btn[aria-expanded="true"] .trail {
  transform: rotate(180deg);
}

/* 触发器：顶栏头像 */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
@media (max-width: 599.98px) {
  .icon-btn {
    width: 44px;
    height: 44px;
  }
}

/* 菜单浮层 */
.menu {
  position: absolute;
  z-index: var(--z-fab);
  width: 240px;
  padding: var(--space-2);
  background: var(--color-surface-container-high);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-large);
  box-shadow: var(--elevation-level-2);
}
.variant-chip .menu {
  left: 0;
  bottom: calc(100% + 8px);
}
.variant-icon .menu {
  right: 0;
  top: calc(100% + 8px);
}

.menu-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-3);
  min-width: 0;
}
.menu-head-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}
.menu-head-text strong {
  font: var(--type-title-small-size) / 1.35 var(--font-sans);
  font-weight: 600;
}
.menu-head-text small {
  font: var(--type-body-small-size) / 1.35 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.menu-divider {
  border-top: 1px solid var(--color-outline-variant);
  margin: 0 calc(var(--space-2) * -1) var(--space-1);
}
.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-2);
  border-radius: var(--radius-medium);
  color: var(--color-on-surface);
  font: var(--type-body-medium-size) / 1.4 var(--font-sans);
  text-align: left;
}
.menu-item.danger {
  color: var(--color-error);
}

/* 进出场 */
.menu-enter-active,
.menu-leave-active {
  transition:
    opacity var(--motion-short) var(--ease-standard),
    transform var(--motion-short) var(--ease-emphasized-decelerate);
}
.variant-chip .menu-enter-from,
.variant-chip .menu-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
.variant-icon .menu-enter-from,
.variant-icon .menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
