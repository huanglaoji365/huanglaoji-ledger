/* ============================================================
   UI Store — 主题 / 全局添加账单入口 / Toast 队列
   ============================================================ */

import { readonly, reactive } from 'vue'
import type { Transaction } from '../data/types'

export type ThemeMode = 'light' | 'dark' | 'system'

/** 主题色相（0–360，OKLCH 实时派生全局品牌色） */
export const DEFAULT_HUE = 75

export interface Toast {
  id: number
  message: string
  actionLabel?: string
  duration: number
}

interface UiState {
  theme: ThemeMode
  hue: number
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

function initialHue(): number {
  const saved = Number(localStorage.getItem(HUE_KEY))
  return Number.isFinite(saved) && saved >= 0 && saved <= 360 ? saved : DEFAULT_HUE
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

function applyHue(hue: number) {
  document.documentElement.style.setProperty('--hue', String(hue))
}

applyTheme(state.theme)
applyHue(state.hue)

function setTheme(mode: ThemeMode) {
  state.theme = mode
  localStorage.setItem(THEME_KEY, mode)
  applyTheme(mode)
}

function setHue(hue: number) {
  const h = Math.round(Math.min(360, Math.max(0, hue)))
  state.hue = h
  localStorage.setItem(HUE_KEY, String(h))
  applyHue(h)
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
