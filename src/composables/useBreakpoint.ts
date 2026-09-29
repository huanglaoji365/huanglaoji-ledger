/* ============================================================
   useBreakpoint — 响应式断点（组件跨设备切换形态）
   mobile: <600 | tablet: 600–1023 | desktop: 1024–1439 | large: ≥1440
   ============================================================ */

import { computed, onScopeDispose, ref } from 'vue'

export interface Breakpoints {
  /** < 600px */
  mobile: Readonly<Ref<boolean>>
  /** 600 – 1023px */
  tablet: Readonly<Ref<boolean>>
  /** >= 1024px */
  desktop: Readonly<Ref<boolean>>
  /** >= 1440px */
  large: Readonly<Ref<boolean>>
}

import type { Ref } from 'vue'

function mediaQuery(query: string): Ref<boolean> {
  const mql = window.matchMedia(query)
  const value = ref(mql.matches)
  const onChange = (e: MediaQueryListEvent) => {
    value.value = e.matches
  }
  mql.addEventListener('change', onChange)
  onScopeDispose(() => mql.removeEventListener('change', onChange))
  return value as Ref<boolean>
}

/** 当前断点区间名称 */
export type BreakpointName = 'mobile' | 'tablet' | 'desktop' | 'large'

export function useBreakpoints(): Breakpoints {
  const isMobile = mediaQuery('(max-width: 599.98px)')
  const isTabletUp = mediaQuery('(min-width: 600px)')
  const isDesktopUp = mediaQuery('(min-width: 1024px)')
  const isLargeUp = mediaQuery('(min-width: 1440px)')

  const tablet = computed(() => isTabletUp.value && !isDesktopUp.value)

  return {
    mobile: isMobile,
    tablet,
    desktop: isDesktopUp,
    large: isLargeUp,
  }
}

export function useBreakpointName(): Ref<BreakpointName> {
  const { mobile, tablet, desktop, large } = useBreakpoints()
  return computed(() => {
    if (mobile.value) return 'mobile'
    if (tablet.value) return 'tablet'
    if (large.value) return 'large'
    return 'desktop'
  })
}
