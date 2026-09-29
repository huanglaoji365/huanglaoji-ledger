<script setup lang="ts">
/**
 * Settings 设置 — 外观 / 数据 / 关于
 */
import { computed, ref } from 'vue'
import { useUi, type ThemeMode, type ThemeHue, THEME_HUES } from '../composables/useUi'
import { useLedger } from '../composables/useLedger'
import PageHeader from '../components/layout/PageHeader.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import Modal from '../components/ui/Modal.vue'
import AppIcon from '../components/ui/AppIcon.vue'

const ui = useUi()
const ledger = useLedger()

const theme = computed({
  get: () => ui.state.theme,
  set: (v: string) => ui.setTheme(v as ThemeMode),
})

const hue = computed({
  get: () => ui.state.hue,
  set: (v: string) => ui.setHue(v as ThemeHue),
})

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function exportJson() {
  download(`黄老吉记账-备份-${new Date().toISOString().slice(0, 10)}.json`, ledger.exportJSON(), 'application/json')
  ui.toast('JSON 备份已导出')
}

function exportCsv() {
  download(`黄老吉记账-交易-${new Date().toISOString().slice(0, 10)}.csv`, '\ufeff' + ledger.exportCSV(), 'text/csv;charset=utf-8')
  ui.toast('CSV 已导出')
}

const resetOpen = ref(false)
function doReset() {
  location.reload()
}
</script>

<template>
  <div class="settings page">
    <PageHeader title="设置" description="个性化你的记账体验" />

    <!-- 外观 -->
    <AppCard padding="lg" class="section">
      <h2 class="section-title">
        <AppIcon name="sun" :size="18" aria-hidden="true" />
        外观
      </h2>
      <div class="row">
        <div class="row-text">
          <p class="row-title">主题模式</p>
          <p class="row-desc">深色模式自动适配系统设置，也可手动固定。</p>
        </div>
        <SegmentedControl
          v-model="theme"
          label="主题模式"
          :options="[
            { value: 'system', label: '跟随系统', icon: 'monitor' },
            { value: 'light', label: '浅色', icon: 'sun' },
            { value: 'dark', label: '深色', icon: 'moon' },
          ]"
        />
      </div>
      <hr class="divider" />
      <div class="row">
        <div class="row-text">
          <p class="row-title">主题色</p>
          <p class="row-desc">品牌色相全局即时生效，表面色随之协调变化。</p>
        </div>
        <div class="swatches" role="radiogroup" aria-label="主题色">
          <button
            v-for="h in THEME_HUES"
            :key="h.id"
            type="button"
            class="swatch"
            :class="{ active: hue === h.id }"
            role="radio"
            :aria-checked="hue === h.id"
            :aria-label="h.name"
            :title="h.name"
            :style="{ background: h.color, color: h.check }"
            @click="hue = h.id"
          >
            <AppIcon v-if="hue === h.id" name="check" :size="14" />
          </button>
        </div>
      </div>
    </AppCard>

    <!-- 数据 -->
    <AppCard padding="lg" class="section">
      <h2 class="section-title">
        <AppIcon name="download" :size="18" aria-hidden="true" />
        数据
      </h2>
      <div class="row">
        <div class="row-text">
          <p class="row-title">导出备份（JSON）</p>
          <p class="row-desc">导出全部交易、分类、账户与预算数据。</p>
        </div>
        <AppButton variant="tonal" icon="download" @click="exportJson">导出</AppButton>
      </div>
      <hr class="divider" />
      <div class="row">
        <div class="row-text">
          <p class="row-title">导出交易明细（CSV）</p>
          <p class="row-desc">可用于 Excel 或其他记账工具导入。</p>
        </div>
        <AppButton variant="tonal" icon="download" @click="exportCsv">导出</AppButton>
      </div>
      <hr class="divider" />
      <div class="row">
        <div class="row-text">
          <p class="row-title">重置演示数据</p>
          <p class="row-desc">清除本地修改，恢复初始演示数据。</p>
        </div>
        <AppButton variant="outlined" icon="refresh" @click="resetOpen = true">重置</AppButton>
      </div>
    </AppCard>

    <!-- 关于 -->
    <AppCard padding="lg" class="section">
      <h2 class="section-title">
        <AppIcon name="info" :size="18" aria-hidden="true" />
        关于
      </h2>
      <div class="about">
        <p class="about-name">黄老吉记账</p>
        <p class="about-version">Version 1.0.0 · Material 3 Expressive Design System</p>
        <p class="about-desc">
          一个基于设计令牌与响应式组件体系构建的个人财务管理应用。
          Mobile / Tablet / Desktop 共享同一套 Design System，并按屏幕尺寸提供不同的信息架构与交互方式。
        </p>
      </div>
    </AppCard>

    <!-- 重置确认 -->
    <Modal :open="resetOpen" title="重置演示数据" size="sm" @close="resetOpen = false">
      <p class="confirm-text">将清除你在演示中做出的全部修改（交易、预算、分类、账户），恢复到初始数据。确定继续吗？</p>
      <template #footer>
        <AppButton variant="text" @click="resetOpen = false">取消</AppButton>
        <AppButton variant="danger" @click="doReset">重置</AppButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 820px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font: var(--type-title-small-size) / 1.4 var(--font-sans);
  font-weight: var(--type-title-small-weight);
  color: var(--color-on-surface-variant);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.row-text {
  flex: 1;
  min-width: 220px;
}
.row-title {
  font: var(--type-body-large-size) / 1.5 var(--font-sans);
  font-weight: 500;
  color: var(--color-on-surface);
}
.row-desc {
  margin-top: 2px;
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.divider {
  border-top: 1px solid var(--color-outline-variant);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
  transition:
    transform var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .swatch:hover {
    transform: scale(1.08);
  }
}
.swatch.active {
  box-shadow:
    inset 0 0 0 1px rgb(0 0 0 / 0.06),
    0 0 0 2px var(--color-surface-container-low),
    0 0 0 4px var(--color-on-surface-variant);
}

.about-name {
  font: var(--type-title-medium-size) / 1.5 var(--font-sans);
  font-weight: var(--type-title-medium-weight);
}
.about-version {
  margin-top: 2px;
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.about-desc {
  margin-top: var(--space-3);
  font: var(--type-body-medium-size) / 1.7 var(--font-sans);
  color: var(--color-on-surface-variant);
  max-width: 560px;
}

.confirm-text {
  font: var(--type-body-large-size) / 1.6 var(--font-sans);
}
</style>
