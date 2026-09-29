<script setup lang="ts">
/**
 * Budgets 预算管理 — 总览 + 预算卡网格 + 新增/编辑/删除
 */
import { computed, reactive, ref } from 'vue'
import { useLedger } from '../composables/useLedger'
import { useUi } from '../composables/useUi'
import { formatAmount, formatPercent } from '../data/format'
import PageHeader from '../components/layout/PageHeader.vue'
import ExpressiveCard from '../components/ui/ExpressiveCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import Modal from '../components/ui/Modal.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import BudgetCard from '../components/finance/BudgetCard.vue'
import BudgetProgress from '../components/finance/BudgetProgress.vue'
import type { BudgetProgress as ProgressData } from '../data/types'

const ledger = useLedger()
const ui = useUi()

const budgets = computed(() => ledger.budgetsWithProgress.value)

const totalBudget = computed(() => budgets.value.reduce((s, b) => s + b.amount, 0))
const totalSpent = computed(() => budgets.value.reduce((s, b) => s + b.spent, 0))
const overall = computed<ProgressData>(() => ({
  id: 'overall',
  category: '',
  amount: totalBudget.value,
  period: 'monthly',
  spent: totalSpent.value,
  remaining: totalBudget.value - totalSpent.value,
  ratio: totalBudget.value ? totalSpent.value / totalBudget.value : 0,
  status:
    totalBudget.value && totalSpent.value >= totalBudget.value
      ? 'over'
      : totalBudget.value && totalSpent.value >= totalBudget.value * 0.8
        ? 'warning'
        : 'normal',
}))

/* ---------------- 新增 / 编辑 ---------------- */

const editingId = ref<string | null>(null)
const formOpen = ref(false)
const form = reactive({ category: '', amount: '' })
const amountError = ref('')

const budgetedCategories = computed(() => new Set(budgets.value.map((b) => b.category)))

const categoryOptions = computed(() =>
  ledger.state.categories
    .filter((c) => c.type === 'expense')
    .map((c) => ({
      value: c.id,
      label: budgetedCategories.value.has(c.id) && !editingId.value ? `${c.name}（已有预算）` : c.name,
    })),
)

function openAdd() {
  editingId.value = null
  form.category = categoryOptions.value[0]?.value ?? ''
  form.amount = ''
  amountError.value = ''
  formOpen.value = true
}

function openEdit(b: ProgressData) {
  editingId.value = b.id
  form.category = b.category
  form.amount = String(b.amount)
  amountError.value = ''
  formOpen.value = true
}

function save() {
  const n = Number(form.amount)
  if (!form.amount || Number.isNaN(n) || n <= 0) {
    amountError.value = '请输入大于 0 的预算金额'
    return
  }
  if (editingId.value) {
    ledger.updateBudget(editingId.value, { amount: n })
    ui.toast('预算已更新')
  } else {
    ledger.addBudget({ category: form.category, amount: n, period: 'monthly' })
    ui.toast('预算已创建')
  }
  formOpen.value = false
}

/* ---------------- 删除 ---------------- */

const deleteTarget = ref<ProgressData | null>(null)
const confirmOpen = ref(false)

function askDelete(b: ProgressData) {
  deleteTarget.value = b
  confirmOpen.value = true
}

function doDelete() {
  if (deleteTarget.value) {
    ledger.deleteBudget(deleteTarget.value.id)
    ui.toast('预算已删除')
  }
  confirmOpen.value = false
}
</script>

<template>
  <div class="budgets page">
    <PageHeader title="预算管理" description="按分类控制每月支出">
      <template #actions>
        <AppButton variant="filled" icon="plus" @click="openAdd">新增预算</AppButton>
      </template>
    </PageHeader>

    <!-- 本月预算总览 -->
    <ExpressiveCard tone="primary" class="overall">
      <div class="overall-grid">
        <div class="overall-info">
          <span class="overall-label">本月预算执行</span>
          <p class="overall-value numeric">
            {{ formatAmount(totalSpent) }} <span class="of">/ {{ formatAmount(totalBudget) }}</span>
          </p>
          <p class="overall-sub">
            已使用 {{ formatPercent(overall.ratio) }} ·
            <template v-if="overall.remaining >= 0">还剩 {{ formatAmount(overall.remaining) }}</template>
            <template v-else>已超支 {{ formatAmount(Math.abs(overall.remaining)) }}</template>
          </p>
        </div>
        <div class="overall-progress">
          <BudgetProgress :budget="overall" :show-remaining="false" />
        </div>
      </div>
    </ExpressiveCard>

    <!-- 预算卡列表 -->
    <div v-if="budgets.length" class="grid">
      <BudgetCard
        v-for="b in budgets"
        :key="b.id"
        :budget="b"
        @edit="openEdit(b)"
        @delete="askDelete(b)"
      />
    </div>
    <EmptyState
      v-else
      icon="wallet"
      title="还没有预算"
      description="为常用分类设置每月预算，超支前会提醒你。"
    >
      <AppButton variant="tonal" icon="plus" @click="openAdd">新增预算</AppButton>
    </EmptyState>

    <!-- 新增 / 编辑弹窗 -->
    <Modal :open="formOpen" :title="editingId ? '编辑预算' : '新增预算'" size="sm" @close="formOpen = false">
      <div class="form">
        <AppSelect
          v-model="form.category"
          :options="categoryOptions"
          label="分类"
          :disabled="!!editingId"
          block
        />
        <AppInput v-model="form.amount" label="每月预算金额" inputmode="decimal" :error="amountError" />
      </div>
      <template #footer>
        <AppButton variant="text" @click="formOpen = false">取消</AppButton>
        <AppButton variant="filled" @click="save">{{ editingId ? '保存' : '创建' }}</AppButton>
      </template>
    </Modal>

    <!-- 删除确认 -->
    <Modal :open="confirmOpen" title="删除预算" size="sm" @close="confirmOpen = false">
      <p class="confirm-text">
        确定删除「{{ deleteTarget ? ledger.categoryById(deleteTarget.category).name : '' }}」的预算吗？该操作不可撤销。
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
  gap: var(--space-6);
}

.overall-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.overall-label {
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  opacity: 0.85;
}
.overall-value {
  margin-top: var(--space-2);
  font-size: clamp(28px, 7cqi, 40px);
  font-weight: 650;
  letter-spacing: -0.4px;
  line-height: 1.2;
}
.overall-value .of {
  font-size: 0.55em;
  font-weight: 500;
  opacity: 0.7;
}
.overall-sub {
  margin-top: var(--space-1);
  font: var(--type-body-medium-size) / 1.5 var(--font-sans);
  opacity: 0.75;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.confirm-text {
  font: var(--type-body-large-size) / 1.6 var(--font-sans);
}

@media (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .overall-grid {
    flex-direction: row;
    align-items: center;
    gap: var(--space-10);
  }
  .overall-info {
    flex-shrink: 0;
    min-width: 280px;
  }
  .overall-progress {
    flex: 1;
    max-width: 520px;
  }
}
</style>
