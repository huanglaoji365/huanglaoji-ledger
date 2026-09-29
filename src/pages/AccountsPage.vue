<script setup lang="ts">
/**
 * Accounts 账户管理 — 净资产总览 + 账户卡 + 新增/编辑/删除
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLedger } from '../composables/useLedger'
import { useUi } from '../composables/useUi'
import { formatAmount } from '../data/format'
import type { Account, AccountType } from '../data/types'
import PageHeader from '../components/layout/PageHeader.vue'
import ExpressiveCard from '../components/ui/ExpressiveCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppSelect from '../components/ui/AppSelect.vue'
import Modal from '../components/ui/Modal.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import AccountCard from '../components/finance/AccountCard.vue'

const ledger = useLedger()
const ui = useUi()
const router = useRouter()

const accounts = computed(() => ledger.state.accounts)

const assets = computed(() =>
  accounts.value.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0),
)
const debts = computed(() =>
  accounts.value.filter((a) => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0),
)
const netWorth = computed(() => assets.value - debts.value)

const goFlow = (a: Account) => router.push({ path: '/transactions', query: { account: a.id } })

/* ---------------- 新增 / 编辑 ---------------- */

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'bank', label: '银行卡' },
  { value: 'mobile-pay', label: '移动支付' },
  { value: 'cash', label: '现金' },
  { value: 'credit', label: '信用卡' },
]

const ICON_BY_TYPE: Record<AccountType, string> = {
  bank: 'bank',
  'mobile-pay': 'smartphone',
  cash: 'banknote',
  credit: 'credit-card',
}

const editingId = ref<string | null>(null)
const formOpen = ref(false)
const form = reactive({ name: '', type: 'bank' as AccountType, balance: '', note: '' })
const nameError = ref('')
const balanceError = ref('')

function openAdd() {
  editingId.value = null
  form.name = ''
  form.type = 'bank'
  form.balance = ''
  form.note = ''
  nameError.value = ''
  balanceError.value = ''
  formOpen.value = true
}

function openEdit(a: Account) {
  editingId.value = a.id
  form.name = a.name
  form.type = a.type
  form.balance = String(a.balance)
  form.note = a.note ?? ''
  nameError.value = ''
  balanceError.value = ''
  formOpen.value = true
}

function save() {
  const name = form.name.trim()
  const balance = Number(form.balance)
  let ok = true
  if (!name) {
    nameError.value = '请输入账户名称'
    ok = false
  } else nameError.value = ''
  if (form.balance === '' || Number.isNaN(balance)) {
    balanceError.value = '请输入当前余额（信用卡负债用负数）'
    ok = false
  } else balanceError.value = ''
  if (!ok) return

  if (editingId.value) {
    ledger.updateAccount(editingId.value, {
      name,
      type: form.type,
      balance,
      note: form.note.trim() || undefined,
      icon: ICON_BY_TYPE[form.type],
    })
    ui.toast('账户已更新')
  } else {
    ledger.addAccount({
      name,
      type: form.type,
      balance,
      note: form.note.trim() || undefined,
      icon: ICON_BY_TYPE[form.type],
    })
    ui.toast('账户已创建')
  }
  formOpen.value = false
}

/* ---------------- 删除 ---------------- */

const deleteTarget = ref<Account | null>(null)
const confirmOpen = ref(false)

function askDelete(a: Account) {
  deleteTarget.value = a
  confirmOpen.value = true
}

function doDelete() {
  if (deleteTarget.value) {
    ledger.deleteAccount(deleteTarget.value.id)
    ui.toast('账户已删除')
  }
  confirmOpen.value = false
}
</script>

<template>
  <div class="accounts page">
    <PageHeader title="账户管理" description="管理银行卡、移动支付与现金账户">
      <template #actions>
        <AppButton variant="filled" icon="plus" @click="openAdd">新增账户</AppButton>
      </template>
    </PageHeader>

    <ExpressiveCard tone="primary" class="net">
      <div class="net-grid">
        <div>
          <span class="net-label">净资产</span>
          <p class="net-value numeric">{{ formatAmount(netWorth) }}</p>
        </div>
        <div class="net-breakdown">
          <div class="net-item">
            <span class="k">总资产</span>
            <strong class="numeric tone-income">{{ formatAmount(assets) }}</strong>
          </div>
          <div class="net-item">
            <span class="k">总负债</span>
            <strong class="numeric tone-expense">{{ formatAmount(debts) }}</strong>
          </div>
        </div>
      </div>
    </ExpressiveCard>

    <div v-if="accounts.length" class="grid">
      <AccountCard
        v-for="a in accounts"
        :key="a.id"
        :account="a"
        @click="goFlow(a)"
        @edit="openEdit(a)"
      />
    </div>
    <EmptyState v-else icon="credit-card" title="还没有账户" description="添加一个账户开始管理余额。" />

    <!-- 新增 / 编辑 -->
    <Modal :open="formOpen" :title="editingId ? '编辑账户' : '新增账户'" size="sm" @close="formOpen = false">
      <div class="form">
        <AppInput v-model="form.name" label="账户名称" :maxlength="12" :error="nameError" />
        <AppSelect v-model="form.type" :options="TYPE_OPTIONS" label="账户类型" block />
        <AppInput
          v-model="form.balance"
          label="当前余额（负债用负数，如 -2340.50）"
          inputmode="decimal"
          :error="balanceError"
        />
        <AppInput v-model="form.note" label="备注（可选，如卡号尾号）" :maxlength="20" />
      </div>
      <template #footer>
        <AppButton variant="text" @click="formOpen = false">取消</AppButton>
        <AppButton variant="filled" @click="save">{{ editingId ? '保存' : '创建' }}</AppButton>
      </template>
    </Modal>

    <!-- 删除确认 -->
    <Modal :open="confirmOpen" title="删除账户" size="sm" @close="confirmOpen = false">
      <p class="confirm-text">确定删除账户「{{ deleteTarget?.name }}」吗？该账户下的交易记录会保留。</p>
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

.net-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.net-label {
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  opacity: 0.85;
}
.net-value {
  margin-top: var(--space-1);
  font-size: clamp(30px, 8cqi, 44px);
  font-weight: 650;
  letter-spacing: -0.5px;
  line-height: 1.2;
}
.net-breakdown {
  display: flex;
  gap: var(--space-8);
}
.net-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.net-item .k {
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
  opacity: 0.75;
}
.net-item strong {
  font-size: var(--type-title-medium-size);
  font-weight: 650;
}
.tone-income { color: var(--color-income); }
.tone-expense { color: var(--color-expense); }

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
  .net-grid {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .net-value {
    min-width: 260px;
  }
}
</style>
