/* ============================================================
   useOverlay — 弹层公共行为：滚动锁 + 打开时初始焦点
   （Esc 与焦点圈定由 useFocusTrap 负责）
   ============================================================ */

import { watch, type Ref } from 'vue'

let lockCount = 0

function lockScroll() {
  lockCount++
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden'
  }
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = ''
  }
}

export function useScrollLock(open: Ref<boolean>) {
  watch(
    open,
    (v) => {
      if (v) lockScroll()
      else unlockScroll()
    },
    { immediate: false },
  )
}

/* ------------------------------------------------------------
   Esc 处理栈：后打开的弹层（如日历浮层）优先响应 Esc，
   只关闭最上层，避免把整个抽屉一起关掉。
   ------------------------------------------------------------ */

type EscHandler = () => void
const escStack: EscHandler[] = []
let escListenerAttached = false

function onDocEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  const top = escStack[escStack.length - 1]
  if (!top) return
  e.preventDefault()
  e.stopPropagation()
  top()
}

export function pushEscHandler(fn: EscHandler): () => void {
  escStack.push(fn)
  if (!escListenerAttached) {
    document.addEventListener('keydown', onDocEscape, true)
    escListenerAttached = true
  }
  return () => {
    const i = escStack.indexOf(fn)
    if (i !== -1) escStack.splice(i, 1)
  }
}
