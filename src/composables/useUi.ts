/* ============================================================
   UI Store — 主题 / 全局添加账单入口 / Toast 队列
   ============================================================ */

import { readonly, reactive } from 'vue'
import type { Transaction } from '../data/types'

export type ThemeMode = 'light' | 'dark' | 'system'

export type ThemeHue = 'amber' | 'ocean' | 'forest' | 'aqua' | 'violet' | 'wine' | 'graphite'

/** 主题色预设（swatch 展示色 / 勾选对比色） */
export const THEME_HUES: { id: ThemeHue; name: string; color: string; check: string }[] = [
  { id: 'amber', name: '暖金', color: '#e8bf55', check: '#3f2e00' },
  { id: 'ocean', name: '海蓝', color: '#3f62b3', check: '#ffffff' },
  { id: 'forest', name: '翠绿', color: '#2b7d54', check: '#ffffff' },
  { id: 'aqua', name: '天青', color: '#2a7f92', check: '#ffffff' },
  { id: 'violet', name: '紫罗兰', color: '#6f57ad', check: '#ffffff' },
  { id: 'wine', name: '酒红', color: '#a83e45', check: '#ffffff' },
  { id: 'graphite', name: '石墨', color: '#5b5d66', check: '#ffffff' },
]

export interface Toast {
  id: number
  message: string
  actionLabel?: string
  duration: number
}

interface UiState {
  theme: ThemeMode
  hue: ThemeHue
  addSheetOpen: boolean
  /** 当前正在编辑的交易（null 表示新增） */
  editing: Transaction | null
  toasts: Toast[]
}

const THEME_KEY = 'hlj-theme'
const HUE_KEY = 'hlj-hue'

function initialTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

function initialHue(): ThemeHue {
  const saved = localStorage.getItem(HUE_KEY) as ThemeHue | null
  return saved && THEME_HUES.some((h) => h.id === saved) ? saved : 'amber'
}

const state = reactive<UiState>({
  theme: initialTheme(),
  hue: initialHue(),
  addSheetOpen: false,
  editing: null,
  toasts: [],
})

let toastSeq = 0

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'system') {
    delete root.dataset.theme
  } else {
    root.dataset.theme = mode
  }
}

function applyHue(hue: ThemeHue) {
  const root = document.documentElement
  if (hue === 'amber') {
    delete root.dataset.hue
  } else {
    root.dataset.hue = hue
  }
}

applyTheme(state.theme)
applyHue(state.hue)

function setTheme(mode: ThemeMode) {
  state.theme = mode
  localStorage.setItem(THEME_KEY, mode)
  applyTheme(mode)
}

function setHue(hue: ThemeHue) {
  state.hue = hue
  localStorage.setItem(HUE_KEY, hue)
  applyHue(hue)
}

function openAddSheet() {
  state.editing = null
  state.addSheetOpen = true
}

function openEditSheet(t: Transaction) {
  state.editing = t
  state.addSheetOpen = true
}

function closeAddSheet() {
  state.addSheetOpen = false
  state.editing = null
}

function toast(message: string, options: { actionLabel?: string; duration?: number } = {}): number {
  const id = ++toastSeq
  state.toasts.push({ id, message, actionLabel: options.actionLabel, duration: options.duration ?? 3200 })
  if (state.toasts.length > 3) state.toasts.shift()
  return id
}

function dismissToast(id: number) {
  const idx = state.toasts.findIndex((t) => t.id === id)
  if (idx !== -1) state.toasts.splice(idx, 1)
}

export function useUi() {
  return {
    state: readonly(state) as Readonly<UiState>,
    setTheme,
    setHue,
    openAddSheet,
    openEditSheet,
    closeAddSheet,
    toast,
    dismissToast,
  }
}
