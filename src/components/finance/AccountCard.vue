<script setup lang="ts">
/**
 * AccountCard — 账户卡（余额 / 类型 / 尾号）
 * 信用卡负债以负数 + 「负债」标签表达，不单靠颜色。
 */
import { computed } from 'vue'
import type { Account } from '../../data/types'
import { formatAmount } from '../../data/format'
import AppIcon from '../ui/AppIcon.vue'

const props = defineProps<{
  account: Account
}>()

const emit = defineEmits<{ click: []; edit: [] }>()

const TYPE_META: Record<Account['type'], { label: string; icon: string }> = {
  bank: { label: '银行卡', icon: 'bank' },
  'mobile-pay': { label: '移动支付', icon: 'smartphone' },
  cash: { label: '现金', icon: 'banknote' },
  credit: { label: '信用卡', icon: 'credit-card' },
}

const meta = computed(() => TYPE_META[props.account.type])
const isDebt = computed(() => props.account.balance < 0)
const balanceText = computed(() =>
  `${isDebt.value ? '-' : ''}${formatAmount(Math.abs(props.account.balance))}`,
)
</script>

<template>
  <article class="account-card" :aria-label="`${account.name}，${isDebt ? '负债' : '余额'} ${balanceText}`">
    <header class="head">
      <span class="icon-wrap" aria-hidden="true">
        <AppIcon :name="meta.icon" :size="22" />
      </span>
      <div class="names">
        <h3 class="name">{{ account.name }}</h3>
        <span class="type">{{ meta.label }}<template v-if="account.note"> · {{ account.note }}</template></span>
      </div>
      <IconButton icon="pencil" label="编辑账户" variant="standard" size="sm" @click.stop="emit('edit')" />
    </header>
    <div class="balance-row">
      <strong class="balance numeric" :class="{ debt: isDebt }">{{ balanceText }}</strong>
      <span v-if="isDebt" class="debt-tag" aria-hidden="false">负债</span>
    </div>
    <footer class="footer">
      <button class="link" type="button" @click="emit('click')">
        查看流水
        <AppIcon name="chevron-right" :size="14" aria-hidden="true" />
      </button>
    </footer>
  </article>
</template>

<style scoped>
.account-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  background: var(--color-surface-container-low);
  border-radius: var(--radius-large);
  min-width: 0;
}
@media (max-width: 599.98px) {
  .account-card {
    padding: var(--space-4);
  }
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-medium);
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
  flex-shrink: 0;
}
.names {
  flex: 1;
  min-width: 0;
}
.name {
  font: var(--type-title-small-size) / 1.4 var(--font-sans);
  font-weight: var(--type-title-small-weight);
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.type {
  font: var(--type-body-small-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.balance-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.balance {
  font-size: var(--type-title-large-size);
  font-weight: 650;
  letter-spacing: -0.2px;
  color: var(--color-on-surface);
}
.balance.debt {
  color: var(--color-expense);
}
.debt-tag {
  font: var(--type-label-small-size) / 1.5 var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  color: var(--color-expense);
  background: color-mix(in srgb, var(--color-expense) 12%, transparent);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
}

.footer {
  border-top: 1px solid var(--color-outline-variant);
  padding-top: var(--space-3);
  display: flex;
  justify-content: flex-end;
}
.link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--color-primary);
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  border-radius: var(--radius-small);
}
</style>
