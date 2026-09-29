<script setup lang="ts">
/**
 * Categories 分类管理 — 分类列表 + 新增/编辑/删除
 */
import { computed, reactive, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useUi } from '../composables/useUi'
import { formatAmount, formatInt, monthOf } from '../data/format'
import type { Category, CategoryColor } from '../data/types'
import PageHeader from '../components/layout/PageHeader.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppInput from '../components/ui/AppInput.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import Modal from '../components/ui/Modal.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import CategoryAvatar from '../components/finance/CategoryAvatar.vue'
import AppIcon from '../components/ui/AppIcon.vue'

const ledger = useLedger()
const ui = useUi()

const typeTab = ref<'expense' | 'income'>('expense')

const month = computed(() => ledger.currentMonth.value)

interface CatStat {
  category: Category
  monthAmount: number
  totalAmount: number
  totalCount: number
}

const list = computed<CatStat[]>(() => {
  const stats = new Map<string, { amount: number; count: number }>()
  for (const t of ledger.state.transactions) {
    const prev = stats.get(t.category) ?? { amount: 0, count: 0 }
    stats.set(t.category, { amount: prev.amount + t.amount, count: prev.count + 1 })
  }
  const monthAmounts = new Map<string, number>()
  for (const t of ledger.state.transactions) {
    if (t.type !== 'expense' || monthOf(t.date) !== month.value) continue
    monthAmounts.set(t.category, (monthAmounts.get(t.category) ?? 0) + t.amount)
  }
  return ledger.state.categories
    .filter((c) => c.type === typeTab.value)
    .map((c) => ({
      category: c,
      monthAmount: monthAmounts.get(c.id) ?? 0,
      totalAmount: stats.get(c.id)?.amount ?? 0,
      totalCount: stats.get(c.id)?.count ?? 0,
    }))
})

/* ---------------- 新增 / 编辑 ---------------- */

const ICON_CHOICES = [
  'utensils', 'bus', 'cart', 'house', 'gamepad', 'heart', 'book', 'gift',
  'briefcase', 'trend-up', 'sparkles', 'smartphone', 'bank', 'banknote',
  'credit-card', 'coins', 'chat', 'zap', 'piggy', 'tag',
]

const editingId = ref<string | null>(null)
const formOpen = ref(false)
const form = reactive({ name: '', icon: 'tag', color: 1 as CategoryColor })
const nameError = ref('')

function openAdd() {
  editingId.value = null
  form.name = ''
  form.icon = typeTab.value === 'expense' ? 'tag' : 'trend-up'
  form.color = 1
  nameError.value = ''
  formOpen.value = true
}

function openEdit(c: Category) {
  editingId.value = c.id
  form.name = c.name
  form.icon = c.icon
  form.color = c.color
  nameError.value = ''
  formOpen.value = true
}

function save() {
  const name = form.name.trim()
  if (!name) {
    nameError.value = '请输入分类名称'
    return
  }
  if (editingId.value) {
    const c = ledger.categoryById(editingId.value)
    c.name = name
    c.icon = form.icon
    c.color = form.color
    ui.toast('分类已更新')
  } else {
    ledger.addCategory({ name, icon: form.icon, color: form.color, type: typeTab.value })
    ui.toast('分类已创建')
  }
  formOpen.value = false
}

/* ---------------- 删除 ---------------- */

const deleteTarget = ref<Category | null>(null)
const confirmOpen = ref(false)

function askDelete(c: Category) {
  deleteTarget.value = c
  confirmOpen.value = true
}

function doDelete() {
  if (deleteTarget.value) {
    ledger.deleteCategory(deleteTarget.value.id)
    ui.toast('分类已删除')
  }
  confirmOpen.value = false
}

const typeLabel = computed(() => (typeTab.value === 'expense' ? '支出' : '收入'))
</script>

<template>
  <div class="cats page">
    <PageHeader title="分类管理" :description="`自定义${typeLabel}分类的图标与颜色`">
      <template #actions>
        <AppButton variant="filled" icon="plus" @click="openAdd">新增{{ typeLabel }}分类</AppButton>
      </template>
    </PageHeader>

    <SegmentedControl
      v-model="typeTab"
      block
      class="tabs"
      label="分类类型"
      :options="[
        { value: 'expense', label: '支出分类' },
        { value: 'income', label: '收入分类' },
      ]"
    />

    <div v-if="list.length" class="grid">
      <AppCard v-for="s in list" :key="s.category.id" padding="md" class="cat-card">
        <header class="cat-head">
          <CategoryAvatar :category="s.category" size="md" />
          <h3 class="cat-name">{{ s.category.name }}</h3>
          <div class="cat-actions">
            <button class="mini-btn" type="button" aria-label="编辑分类" @click="openEdit(s.category)">
              <AppIcon name="pencil" :size="16" />
            </button>
            <button class="mini-btn danger" type="button" aria-label="删除分类" @click="askDelete(s.category)">
              <AppIcon name="trash" :size="16" />
            </button>
          </div>
        </header>
        <dl class="cat-stats">
          <div class="cat-stat">
            <dt class="cat-stat-label">{{ typeTab === 'expense' ? '本月支出' : '累计收入' }}</dt>
            <dd class="cat-stat-value numeric">
              {{ formatAmount(typeTab === 'expense' ? s.monthAmount : s.totalAmount) }}
            </dd>
          </div>
          <div class="cat-stat">
            <dt class="cat-stat-label">累计笔数</dt>
            <dd class="cat-stat-value numeric">{{ formatInt(s.totalCount) }} 笔</dd>
          </div>
        </dl>
      </AppCard>
    </div>
    <EmptyState v-else icon="tag" :title="`暂无${typeLabel}分类`" description="创建一个分类开始记录吧。" />

    <!-- 新增 / 编辑 -->
    <Modal :open="formOpen" :title="editingId ? '编辑分类' : `新增${typeLabel}分类`" size="sm" @close="formOpen = false">
      <div class="form">
        <AppInput v-model="form.name" label="分类名称" :maxlength="8" :error="nameError" />

        <fieldset class="picker">
          <legend class="picker-label">图标</legend>
          <div class="icon-grid" role="radiogroup" aria-label="选择图标">
            <button
              v-for="ic in ICON_CHOICES"
              :key="ic"
              type="button"
              class="icon-opt"
              :class="{ selected: form.icon === ic }"
              role="radio"
              :aria-checked="form.icon === ic"
              @click="form.icon = ic"
            >
              <AppIcon :name="ic" :size="18" />
            </button>
          </div>
        </fieldset>

        <fieldset class="picker">
          <legend class="picker-label">颜色</legend>
          <div class="color-row" role="radiogroup" aria-label="选择颜色">
            <button
              v-for="n in 8"
              :key="n"
              type="button"
              class="color-opt"
              :class="{ selected: form.color === n }"
              role="radio"
              :aria-checked="form.color === n"
              :aria-label="`颜色 ${n}`"
              :style="{ background: `var(--chart-color-${n})` }"
              @click="form.color = n as CategoryColor"
            >
              <AppIcon v-if="form.color === n" name="check" :size="14" class="check" />
            </button>
          </div>
        </fieldset>
      </div>
      <template #footer>
        <AppButton variant="text" @click="formOpen = false">取消</AppButton>
        <AppButton variant="filled" @click="save">{{ editingId ? '保存' : '创建' }}</AppButton>
      </template>
    </Modal>

    <!-- 删除确认 -->
    <Modal :open="confirmOpen" title="删除分类" size="sm" @close="confirmOpen = false">
      <p class="confirm-text">
        确定删除分类「{{ deleteTarget?.name }}」吗？已有的交易记录会保留，但会显示为「未分类」。
      </p>
      <template #footer>
        <AppButton variant="text" @click="confirmOpen = false">取消</AppButton>
        <AppButton variant="danger" @click="doDelete">删除</AppButton>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.tabs {
  width: fit-content;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.cat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.cat-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.cat-name {
  flex: 1;
  min-width: 0;
  font: var(--type-title-small-size) / 1.4 var(--font-sans);
  font-weight: var(--type-title-small-weight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-stats {
  display: flex;
  gap: var(--space-8);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-outline-variant);
  margin: 0;
}
.cat-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.cat-stat-label {
  font: var(--type-label-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}
.cat-stat-value {
  font-size: var(--type-title-small-size);
  font-weight: 650;
  line-height: 1.4;
  color: var(--color-on-surface);
  white-space: nowrap;
}
.cat-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}
.mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--color-on-surface-variant);
  transition: background-color var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .mini-btn:hover {
    background: var(--color-surface-container-high);
  }
}
.mini-btn.danger:hover {
  color: var(--color-error);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.picker {
  border: none;
}
.picker-label {
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  color: var(--color-on-surface-variant);
  margin-bottom: var(--space-2);
}
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: var(--space-2);
}
.icon-opt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: var(--radius-medium);
  border: 1.5px solid transparent;
  color: var(--color-on-surface-variant);
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);
}
.icon-opt:hover {
  background: var(--color-surface-container-high);
}
.icon-opt.selected {
  background: var(--color-secondary-container);
  border-color: var(--color-primary);
  color: var(--color-on-secondary-container);
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.color-opt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: transform var(--motion-fast) var(--ease-standard);
}
.color-opt.selected {
  border-color: var(--color-on-surface);
  transform: scale(1.05);
}
.check {
  color: #fff;
}

.confirm-text {
  font: var(--type-body-large-size) / 1.6 var(--font-sans);
}
</style>
