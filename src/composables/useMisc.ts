/* ============================================================
   杂项 Composables
   - usePrefersReducedMotion : 尊重系统减少动效设置
   - useFocusTrap          : 弹层焦点圈定 + Esc 关闭
   - useElementWidth       : 图表容器宽度（ResizeObserver）
   - useClickOutside       : 点击外部关闭
   ============================================================ */

import { onScopeDispose, onUnmounted, ref, watch, type Ref } from 'vue'
import { pushEscHandler } from './useOverlay'

export function usePrefersReducedMotion(): Ref<boolean> {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  const value = ref(mql.matches)
  const onChange = (e: MediaQueryListEvent) => {
    value.value = e.matches
  }
  mql.addEventListener('change', onChange)
  onScopeDispose(() => mql.removeEventListener('change', onChange))
  return value
}

/**
 * 弹层焦点圈定：打开时聚焦容器内第一个可聚焦元素，Tab 循环，
 * Esc 触发 onClose。返回容器 ref。
 */
export function useFocusTrap(active: Ref<boolean>, onClose: () => void) {
  const container = ref<HTMLElement | null>(null)

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

  function getFocusable(): HTMLElement[] {
    const el = container.value
    if (!el) return []
    return [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    )
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active.value) return
    if (e.key !== 'Tab') return
    const items = getFocusable()
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const current = document.activeElement as HTMLElement | null
    if (e.shiftKey) {
      if (current === first || !container.value?.contains(current)) {
        e.preventDefault()
        last.focus()
      }
    } else if (current === last || !container.value?.contains(current)) {
      e.preventDefault()
      first.focus()
    }
  }

  let offEsc: (() => void) | null = null

  watch(active, (isActive) => {
    if (isActive) {
      document.addEventListener('keydown', onKeydown, true)
      // Esc 交给全局处理栈：后打开的浮层（如日历）优先响应
      offEsc = pushEscHandler(onClose)
      requestAnimationFrame(() => {
        const items = getFocusable()
        ;(items[0] ?? container.value)?.focus?.()
      })
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      offEsc?.()
      offEsc = null
    }
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown, true)
    offEsc?.()
  })

  return container
}

/** 观察元素内容宽度（图表自适应用） */
export function useElementWidth(target: Ref<HTMLElement | null>): Ref<number> {
  const width = ref(0)
  let observer: ResizeObserver | null = null

  watch(
    target,
    (el) => {
      observer?.disconnect()
      if (!el) return
      width.value = el.clientWidth
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          width.value = entry.contentRect.width
        }
      })
      observer.observe(el)
    },
    { immediate: true },
  )

  onScopeDispose(() => observer?.disconnect())
  return width
}

/** 点击目标元素外部时触发 */
export function useClickOutside(
  target: Ref<HTMLElement | null>,
  handler: () => void,
  active: () => boolean,
) {
  function onPointerDown(e: PointerEvent) {
    if (!active()) return
    const el = target.value
    if (el && !el.contains(e.target as Node)) handler()
  }
  document.addEventListener('pointerdown', onPointerDown)
  onScopeDispose(() => document.removeEventListener('pointerdown', onPointerDown))
}
