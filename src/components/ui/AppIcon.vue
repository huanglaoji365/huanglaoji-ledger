<script setup lang="ts">
/**
 * AppIcon — 内联 SVG 图标（stroke 风格，随 currentColor 着色）
 * 具备 aria-hidden 默认（装饰性）；语义图标请在外层提供文字或 aria-label。
 */
const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
  }>(),
  { size: 20 },
)

import { computed } from 'vue'

const ICONS: Record<string, string> = {
  /* ---- 导航 ---- */
  home: '<path d="M3.5 10.6 12 3.5l8.5 7.1"/><path d="M5.5 9.3V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.3"/><path d="M9.5 21v-6h5v6"/>',
  receipt: '<path d="M6 3h12v18l-2.4-1.6L13.2 21l-2.4-1.6L8.4 21 6 19.4V3Z"/><path d="M9.5 8h5M9.5 12h5"/>',
  'chart-pie': '<path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"/>',
  wallet: '<path d="M18.5 7V6a2 2 0 0 0-2-2H6a2.5 2.5 0 0 0-2.5 2.5v11A2.5 2.5 0 0 0 6 20h12a2.5 2.5 0 0 0 2.5-2.5v-8A2.5 2.5 0 0 0 18 7H5"/><path d="M16 14h.01"/>',
  tag: '<path d="M3.5 11.2V5.5a2 2 0 0 1 2-2h5.7a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8l-5.7 5.7a2 2 0 0 1-2.8 0l-8-8a2 2 0 0 1-.6-1.4Z"/><circle cx="8" cy="8" r="1.4"/>',
  settings:
    '<path d="M4 7.5h9.2"/><circle cx="17" cy="7.5" r="2.5"/><path d="M20 7.5h.01"/><path d="M20 16.5h-9.2"/><circle cx="7" cy="16.5" r="2.5"/><path d="M4 16.5h.01"/>',
  /* ---- 通用 ---- */
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
  'chevron-up': '<path d="m6 14.5 6-6 6 6"/>',
  'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
  'chevron-left': '<path d="m14.5 6-6 6 6 6"/>',
  'arrow-right': '<path d="M4 12h15"/><path d="M13.5 6.5 19 12l-5.5 5.5"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M9.5 7H17v7.5"/>',
  'arrow-down-right': '<path d="m7 7 10 10"/><path d="M17 9.5V17H9.5"/>',
  'trend-up': '<path d="m4 16.5 5.5-5.5 3.5 3.5 7-7"/><path d="M15 7.5h5v5"/>',
  'trend-down': '<path d="m4 7.5 5.5 5.5 3.5-3.5 7 7"/><path d="M15 16.5h5v-5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  trash: '<path d="M5 7h14"/><path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="m6.5 7 .8 12.1A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.9L17.5 7"/><path d="M10 11v6M14 11v6"/>',
  pencil: '<path d="M4 20l1.2-4.2L15.7 5.3a2.1 2.1 0 0 1 3 3L8.2 18.8 4 20Z"/><path d="m14.5 6.5 3 3"/>',
  'more-vert': '<path d="M12 5.5h.01M12 12h.01M12 18.5h.01"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 19h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.2L4 9.5"/><path d="M4 4.5v5h5"/><path d="M4 13a8 8 0 0 0 14.9 3.2l1.1-1.7"/><path d="M20 19.5v-5h-5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.5"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  'eye-off': '<path d="M4 4l16 16"/><path d="M10.5 5.9A9.4 9.4 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17.6 17.6 0 0 1-2.6 3.3M6.2 6.9A16.8 16.8 0 0 0 2.5 12S6 18.2 12 18.2a9.3 9.3 0 0 0 3.9-.8"/><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4"/>',
  user: '<circle cx="12" cy="8.2" r="3.8"/><path d="M4.5 20.2a7.6 7.6 0 0 1 15 0"/>',
  key: '<circle cx="7.5" cy="16.5" r="4"/><path d="m10.5 13.5 9-9"/><path d="m16 8 3 3"/><path d="m13.5 10.5 2 2"/>',
  list: '<path d="M8.5 6H21M8.5 12H21M8.5 18H21"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  /* ---- 反馈 ---- */
  'alert-circle': '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.5h.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5h.01"/>',
  'check-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  'x-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/>',
  'help-circle': '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.6c0 1.6-2.5 2-2.5 3.4M12 16.6h.01"/>',
  /* ---- 天气 / 主题 ---- */
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8V5M12 19v2.2M2.8 12H5M19 12h2.2M5.2 5.2 6.8 6.8M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  monitor: '<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M9.5 20.5h5M12 17v3.5"/>',
  /* ---- 账户 ---- */
  bank: '<path d="M3.5 9.5 12 4l8.5 5.5h-17Z"/><path d="M5.5 9.5v8M9.8 9.5v8M14.2 9.5v8M18.5 9.5v8"/><path d="M3.5 17.5h17M3.5 20.5h17"/>',
  smartphone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  banknote: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  'credit-card': '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/>',
  chat: '<path d="M12 4c-4.6 0-8 3.1-8 7.2 0 1.7.6 3.2 1.6 4.4L4.5 20l4.4-1.4c.9.3 2 .5 3.1.5 4.6 0 8-3.1 8-7.2S16.6 4 12 4Z"/>',
  coins: '<circle cx="9" cy="9" r="5.5"/><path d="M15.2 9.7A5.5 5.5 0 1 1 9.7 15.2"/>',
  piggy: '<path d="M5.5 12.5c0-3.6 2.9-6 6.5-6 3.4 0 6 2 6.4 5h1.1c.8 0 1.5.7 1.3 1.5l-.5 2a1.4 1.4 0 0 1-1.3 1h-1.2c-.5.9-1.2 1.6-2 2.1v1.4a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1h-2.4a1 1 0 0 1-1 1H7.2a1 1 0 0 1-1-1v-1.9c-.4-.5-.7-1.1-1-1.7l-1.4-.5A1 1 0 0 1 3 14.9v-1.4a1 1 0 0 1 .7-1l1.8-.6"/><path d="M12 6.5V4.8A1.8 1.8 0 0 1 13.8 3c1 0 1.8.8 1.8 1.8V7"/><path d="M9.5 11.5h.01"/>',
  /* ---- 分类 ---- */
  utensils: '<path d="M5 3v6a2.5 2.5 0 0 0 2.5 2.5h.5A2.5 2.5 0 0 0 10.5 9V3"/><path d="M7.75 3v18"/><path d="M19.5 15V3.5a4.5 4.5 0 0 0-4.5 4.5v5a2 2 0 0 0 2 2h2.5Zm0 0v6"/>',
  bus: '<rect x="4.5" y="4" width="15" height="13.5" rx="2.5"/><path d="M4.5 10.5h15M9.7 4v6.5M14.3 4v6.5"/><path d="M8 17.5v2M16 17.5v2"/><path d="M8 14.5h.01M16 14.5h.01"/>',
  cart: '<circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2.2l2.5 12h10.1L21 8H6"/>',
  house: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.7v9.8a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.7"/><path d="M10 20.5v-5.5h4v5.5"/>',
  gamepad:
    '<path d="M6.5 7.5h11A4.5 4.5 0 0 1 22 12c0 2.8-2 5-4.6 5-1.5 0-2.4-.6-3.4-1.5h-4C9 16.4 8.1 17 6.6 17 4 17 2 14.8 2 12a4.5 4.5 0 0 1 4.5-4.5Z"/><path d="M7 10.5v3M5.5 12h3M15 11.5h.01M17.5 13.5h.01"/>',
  heart: '<path d="M12 20.5S4 15.2 4 9.7A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 8 2.8c0 5.5-8 10.8-8 10.8Z"/>',
  book: '<path d="M12 6.5C10.5 4.8 8.3 4 5.5 4c-.8 0-1.6.1-2.5.3V19c.9-.2 1.7-.3 2.5-.3 2.8 0 5 .8 6.5 2.5 1.5-1.7 3.7-2.5 6.5-2.5.8 0 1.6.1 2.5.3V4.3c-.9-.2-1.7-.3-2.5-.3-2.8 0-5 .8-6.5 2.5Z"/><path d="M12 6.5V21"/>',
  gift: '<path d="M4.5 11h15v8.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V11Z"/><path d="M3 7.5h18V11H3Z"/><path d="M12 7.5V21"/><path d="M12 7.5S7.5 7.8 7.5 5C7.5 3.6 8.9 3 10 3.4c1.4.6 2 4.1 2 4.1Z"/><path d="M12 7.5s4.5.3 4.5-2.5C16.5 3.6 15.1 3 14 3.4c-1.4.6-2 4.1-2 4.1Z"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="12.5" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/><path d="M3.5 12.5h17"/>',
  sparkles: '<path d="m12 4 1.7 4.5 4.8 1.5-4.8 1.5L12 16l-1.7-4.5L5.5 10l4.8-1.5L12 4Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
  zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z"/>',
}

const html = computed(() => ICONS[props.name] ?? ICONS['help-circle'])
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="html"
  />
</template>

<style scoped>
.app-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
