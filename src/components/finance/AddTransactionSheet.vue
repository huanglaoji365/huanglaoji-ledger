<script setup lang="ts">
/**
 * AddTransactionSheet — 记一笔 / 编辑交易（全局响应式弹层）
 * Desktop: 右侧 SideSheet；Tablet: 居中 Modal；Mobile: 底部 BottomSheet。
 * 表单状态本地管理；保存写入 ledger store。
 */
import { computed, reactive, ref, watch } from 'vue'
import { useUi } from '../../composables/useUi'
import { useLedger } from '../../composables/useLedger'
import { toIso } from '../../data/format'
import type { TransactionType } from '../../data/types'
import ResponsiveSheet from '../ui/ResponsiveSheet.vue'
import SegmentedControl from '../ui/SegmentedControl.vue'
import AmountInput from '../ui/AmountInput.vue'
import AppInput from '../ui/AppInput.vue'
import AppSelect from '../ui/AppSelect.vue'
import DateField from '../ui/DateField.vue'
import AppButton from '../ui/AppButton.vue'
import IconButton from '../ui/IconButton.vue'
import CategoryAvatar from '../finance/CategoryAvatar.vue'
import AppIcon from '../ui/AppIcon.vue'

const ui = useUi()
const ledger = useLedger()

const open = computed(() => ui.state.addSheetOpen)
const editing = computed(() => ui.state.editing)
const isEdit = computed(() => !!editing.value)

const form = reactive({
  type: 'expense' as TransactionType,
  amount: '',
  category: '',
  account: 'acc-wechat',
  date: toIso(new Date()),
  description: '',
  tagsInput: '',
  tags: [] as string[],
  note: '',
})

const errors = reactive({ amount: '', category: '', account: '' })
const submitting = ref(false)

const accountOptions = computed(() =>
  ledger.state.accounts.map((a) => ({ value: a.id, label: a.name })),
)

const categoriesOfType = computed(() =>
  ledger.state.categories.filter((c) => c.type === form.type),
)

watch(
  open,
  (v) => {
    if (!v) return
    errors.amount = ''
    errors.category = ''
    errors.account = ''
    const t = editing.value
    if (t) {
      form.type = t.type
      form.amount = String(t.amount)
      form.category = t.category
      form.account = t.account
      form.date = t.date
      form.description = t.description
      form.tags = [...t.tags]
      form.note = t.note ?? ''
    } else {
      form.type = 'expense'
      form.amount = ''
      form.category = ''
      form.account = ledger.state.accounts[0]?.id ?? ''
      form.date = toIso(new Date())
      form.description = ''
      form.tags = []
      form.note = ''
    }
  },
)

watch(
  () => form.type,
  () => {
    // 切换类型时若分类不匹配则清空
    const c = ledger.categoryById(form.category)
    if (form.category && c.type !== form.type) form.category = ''
  },
)

function addTag() {
  const v = form.tagsInput.trim().replace(/^#/, '')
  if (v && !form.tags.includes(v) && form.tags.length < 6) form.tags.push(v)
  form.tagsInput = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag)
}

const maxDate = toIso(new Date())

function validate(): boolean {
  errors.amount = ''
  errors.category = ''
  errors.account = ''
  const n = Number(form.amount)
  if (!form.amount || Number.isNaN(n) || n <= 0) {
    errors.amount = '请输入大于 0 的金额'
  }
  if (!form.category) errors.category = '请选择一个分类'
  if (!form.account) errors.account = '请选择账户'
  return !errors.amount && !errors.category && !errors.account
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  const payload = {
    type: form.type,
    amount: Number(form.amount),
    category: form.category,
    account: form.account,
    date: form.date,
    description: form.description.trim() || (form.type === 'income' ? '收入' : '支出'),
    tags: [...form.tags],
    note: form.note.trim() || undefined,
  }
  // 模拟极短保存耗时，保持按钮 loading 反馈
  await new Promise((r) => setTimeout(r, 120))
  if (editing.value) {
    ledger.updateTransaction(editing.value.id, payload)
    ui.toast('交易已更新')
  } else {
    ledger.addTransaction(payload)
    ui.toast(form.type === 'income' ? '已记一笔收入' : '已记一笔支出')
  }
  submitting.value = false
  ui.closeAddSheet()
}

function remove() {
  if (!editing.value) return
  ledger.deleteTransaction(editing.value.id)
  ui.toast('交易已删除')
  ui.closeAddSheet()
}

const sheetTitle = computed(() => (isEdit.value ? '编辑交易' : '记一笔'))
</script>

<template>
  <ResponsiveSheet :open="open" :title="sheetTitle" height="tall" @close="ui.closeAddSheet()">
    <form class="tx-form" novalidate @submit.prevent="submit">
      <!-- 收支类型 -->
      <SegmentedControl
        v-model="form.type"
        block
        label="交易类型"
        :options="[
          { value: 'expense', label: '支出', icon: 'arrow-down-right' },
          { value: 'income', label: '收入', icon: 'arrow-up-right' },
        ]"
      />

      <!-- 金额 -->
      <AmountInput v-model="form.amount" :error="errors.amount" />

      <!-- 分类 -->
      <fieldset class="cat-field" :class="{ invalid: !!errors.category }">
        <legend class="field-label">分类</legend>
        <div class="cat-grid" role="radiogroup" aria-label="选择分类">
          <button
            v-for="c in categoriesOfType"
            :key="c.id"
            type="button"
            class="cat-opt"
            :class="{ selected: form.category === c.id }"
            role="radio"
            :aria-checked="form.category === c.id"
            @click="form.category = c.id"
          >
            <CategoryAvatar :category="c" :size="form.category === c.id ? 'md' : 'sm'" />
            <span class="cat-name">{{ c.name }}</span>
          </button>
        </div>
        <p v-if="errors.category" class="error-text" role="alert">{{ errors.category }}</p>
      </fieldset>

      <!-- 账户 -->
      <div>
        <AppSelect v-model="form.account" :options="accountOptions" label="账户" block />
        <p v-if="errors.account" class="error-text" role="alert">{{ errors.account }}</p>
      </div>

      <!-- 日期 -->
      <DateField v-model="form.date" :max="maxDate" />

      <!-- 描述 -->
      <AppInput
        v-model="form.description"
        :label="form.type === 'income' ? '来源说明（如 工资、红包）' : '事项说明（如 午餐、打车）'"
        :maxlength="30"
      />

      <!-- 标签 -->
      <div class="tags-field">
        <AppInput v-model="form.tagsInput" label="添加标签（回车确认）" :maxlength="10" @keydown.enter.prevent="addTag" />
        <div v-if="form.tags.length" class="tags" aria-label="已添加标签">
          <span v-for="tag in form.tags" :key="tag" class="tag">
            #{{ tag }}
            <button type="button" class="tag-remove" :aria-label="`移除标签 ${tag}`" @click="removeTag(tag)">
              <AppIcon name="close" :size="12" />
            </button>
          </span>
        </div>
      </div>

      <!-- 备注 -->
      <AppInput v-model="form.note" label="备注（可选）" :maxlength="60" />
    </form>

    <template #footer>
      <div class="footer-actions" :class="{ single: !isEdit }">
        <AppButton v-if="isEdit" variant="outlined" size="lg" icon="trash" @click="remove">删除</AppButton>
        <AppButton type="submit" variant="filled" size="lg" :loading="submitting" @click="submit">
          保存
        </AppButton>
      </div>
    </template>
  </ResponsiveSheet>
</template>

<style scoped>
.tx-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.field-label {
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  color: var(--color-on-surface-variant);
  padding: 0 var(--space-1);
}

.cat-field {
  border: none;
  min-width: 0;
}
.cat-field.invalid .field-label {
  color: var(--color-error);
}

.cat-grid {
  margin-top: var(--space-2);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: var(--space-2);
}

.cat-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-1);
  border-radius: var(--radius-medium);
  border: 1.5px solid transparent;
  color: var(--color-on-surface-variant);
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);
  min-width: 0;
}
@media (hover: hover) {
  .cat-opt:hover {
    background: var(--color-surface-container-high);
  }
}
.cat-opt.selected {
  background: var(--color-secondary-container);
  border-color: var(--color-primary);
  color: var(--color-on-secondary-container);
}
.cat-name {
  font: var(--type-label-small-size) / 1.2 var(--font-sans);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-text {
  margin-top: var(--space-1);
  padding-left: var(--space-1);
  font: var(--type-body-small-size) / var(--type-body-small-line-height) var(--font-sans);
  color: var(--color-error);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
}
.tag-remove {
  display: inline-flex;
  border-radius: 50%;
  padding: 2px;
}

.footer-actions {
  display: flex;
  gap: var(--space-2);
  width: 100%;
}
.footer-actions.single .app-btn {
  flex: 1;
}
.footer-actions :deep(.app-button) {
  flex: 1;
}
</style>
