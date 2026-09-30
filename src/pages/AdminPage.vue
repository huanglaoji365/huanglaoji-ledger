<script setup lang="ts">
/**
 * AdminPage — 管理后台（仅 admin 角色可访问）
 * 用户列表 / 搜索 / 禁用启用 / 角色调整 / 重置密码 / 删除用户 / 全站统计。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/client'
import { useAuth } from '../composables/useAuth'
import { useUi } from '../composables/useUi'
import PageHeader from '../components/layout/PageHeader.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import Modal from '../components/ui/Modal.vue'
import SearchInput from '../components/ui/SearchInput.vue'
import StatCard from '../components/ui/StatCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import LoadingState from '../components/ui/LoadingState.vue'

const auth = useAuth()
const ui = useUi()
const me = auth.state.session

interface AdminUser {
  id: string
  username: string
  displayName: string
  email?: string | null
  phone?: string | null
  role: 'user' | 'admin'
  disabled: boolean
  created_at: string
  transaction_count: number
}

interface AdminStats {
  user_count: number
  disabled_count: number
  admin_count: number
  transaction_count: number
  new_users_7d: number
  new_users_30d: number
}

const loading = ref(true)
const users = ref<AdminUser[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const stats = ref<AdminStats | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), page_size: String(pageSize) })
    if (keyword.value.trim()) params.set('q', keyword.value.trim())
    const data = await api<{ items: AdminUser[]; total: number }>(`/admin/users?${params}`)
    users.value = data.items
    total.value = data.total
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    stats.value = await api<AdminStats>('/admin/stats')
  } catch {
    /* 统计失败不阻塞列表 */
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void load()
  }, 300)
}

function goPage(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
  void load()
}

/* ---------------- 操作 ---------------- */

const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmText = ref('')
const confirmDanger = ref(false)
let confirmAction: (() => Promise<void>) | null = null
const confirmBusy = ref(false)

function askConfirm(title: string, text: string, action: () => Promise<void>, danger = false) {
  confirmTitle.value = title
  confirmText.value = text
  confirmDanger.value = danger
  confirmAction = action
  confirmOpen.value = true
}

async function runConfirm() {
  if (!confirmAction) return
  confirmBusy.value = true
  try {
    await confirmAction()
    confirmOpen.value = false
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '操作失败')
  } finally {
    confirmBusy.value = false
  }
}

function toggleDisabled(u: AdminUser) {
  const next = !u.disabled
  askConfirm(
    next ? '禁用账号' : '启用账号',
    next ? `禁用后 ${u.username} 将无法登录和使用，确定继续？` : `恢复 ${u.username} 的使用权限？`,
    async () => {
      const updated = await api<AdminUser>(`/admin/users/${u.id}/status`, { method: 'PATCH', body: { disabled: next } })
      Object.assign(u, updated)
      ui.toast(next ? '账号已禁用' : '账号已启用')
      void loadStats()
    },
    next,
  )
}

function setRole(u: AdminUser) {
  const next = u.role === 'admin' ? 'user' : 'admin'
  askConfirm(
    next === 'admin' ? '设为管理员' : '收回管理员',
    next === 'admin'
      ? `将 ${u.username} 提升为管理员？管理员可管理全部用户。`
      : `收回 ${u.username} 的管理员权限？其登录态将全部失效。`,
    async () => {
      const updated = await api<AdminUser>(`/admin/users/${u.id}/role`, { method: 'PATCH', body: { role: next } })
      Object.assign(u, updated)
      ui.toast(next === 'admin' ? '已设为管理员' : '已收回管理员权限')
      void loadStats()
    },
  )
}

function removeUser(u: AdminUser) {
  askConfirm(
    '删除用户',
    `将永久删除 ${u.username} 及其全部账本数据（交易 / 分类 / 账户 / 预算），不可恢复！`,
    async () => {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' })
      ui.toast('用户已删除')
      void load()
      void loadStats()
    },
    true,
  )
}

/* 重置密码 */
const pwOpen = ref(false)
const pwTarget = ref<AdminUser | null>(null)
const pwNew = ref('')
const pwConfirm = ref('')
const pwError = ref('')
const pwBusy = ref(false)

function askResetPassword(u: AdminUser) {
  pwTarget.value = u
  pwNew.value = ''
  pwConfirm.value = ''
  pwError.value = ''
  pwOpen.value = true
}

async function submitResetPassword() {
  if (!pwTarget.value) return
  if (pwNew.value.length < 6) {
    pwError.value = '新密码至少 6 位'
    return
  }
  if (pwNew.value !== pwConfirm.value) {
    pwError.value = '两次输入的新密码不一致'
    return
  }
  pwBusy.value = true
  try {
    await api(`/admin/users/${pwTarget.value.id}/password`, { method: 'PUT', body: { new_password: pwNew.value } })
    ui.toast(`已重置 ${pwTarget.value.username} 的密码`)
    pwOpen.value = false
  } catch (e) {
    pwError.value = e instanceof Error ? e.message : '重置失败'
  } finally {
    pwBusy.value = false
  }
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

onMounted(() => {
  void load()
  void loadStats()
})
</script>

<template>
  <div class="admin page">
    <PageHeader title="管理后台" description="用户管理与全站数据统计" />

    <!-- 统计 -->
    <div v-if="stats" class="stat-grid">
      <StatCard label="注册用户" :value="String(stats.user_count)" :sub="`近 30 天 +${stats.new_users_30d}`" />
      <StatCard label="管理员" :value="String(stats.admin_count)" sub="拥有后台权限" />
      <StatCard label="已禁用" :value="String(stats.disabled_count)" sub="不可登录" tone="expense" />
      <StatCard label="全局交易" :value="String(stats.transaction_count)" sub="所有用户合计" tone="income" />
    </div>

    <!-- 用户列表 -->
    <AppCard padding="lg" class="users-card">
      <div class="card-head">
        <h2 class="card-title">
          <AppIcon name="user" :size="18" aria-hidden="true" />
          用户列表
        </h2>
        <div class="search-wrap">
          <SearchInput v-model="keyword" placeholder="搜索用户名 / 昵称 / 邮箱 / 手机号" @update:model-value="onSearch" />
        </div>
      </div>

      <LoadingState v-if="loading" />
      <EmptyState v-else-if="users.length === 0" icon="search" title="没有匹配的用户" description="换个关键词试试" />
      <div v-else class="table-wrap">
        <table class="user-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>联系方式</th>
              <th>角色</th>
              <th>状态</th>
              <th class="num">笔数</th>
              <th>注册时间</th>
              <th class="ops">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" :class="{ disabled: u.disabled }">
              <td>
                <div class="cell-user">
                  <span class="name">{{ u.displayName }}</span>
                  <span class="username">@{{ u.username }}</span>
                </div>
              </td>
              <td class="contact">
                <span v-if="u.email">{{ u.email }}</span>
                <span v-if="u.phone">{{ u.phone }}</span>
                <span v-if="!u.email && !u.phone" class="dim">—</span>
              </td>
              <td>
                <span class="badge" :class="u.role === 'admin' ? 'badge-admin' : 'badge-user'">
                  {{ u.role === 'admin' ? '管理员' : '普通用户' }}
                </span>
              </td>
              <td>
                <span class="badge" :class="u.disabled ? 'badge-over' : 'badge-ok'">
                  {{ u.disabled ? '已禁用' : '正常' }}
                </span>
              </td>
              <td class="num">{{ u.transaction_count }}</td>
              <td class="dim">{{ fmtDate(u.created_at) }}</td>
              <td class="ops">
                <div class="op-btns">
                  <AppButton variant="text" size="sm" @click="toggleDisabled(u)">
                    {{ u.disabled ? '启用' : '禁用' }}
                  </AppButton>
                  <AppButton variant="text" size="sm" @click="askResetPassword(u)">重置密码</AppButton>
                  <AppButton variant="text" size="sm" @click="setRole(u)">
                    {{ u.role === 'admin' ? '收回权限' : '设为管理员' }}
                  </AppButton>
                  <AppButton variant="text" size="sm" class="danger" @click="removeUser(u)">删除</AppButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="pager">
        <AppButton variant="text" size="sm" :disabled="page <= 1" @click="goPage(page - 1)">上一页</AppButton>
        <span class="pager-label">{{ page }} / {{ totalPages }}</span>
        <AppButton variant="text" size="sm" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</AppButton>
      </div>
    </AppCard>

    <!-- 通用确认弹窗 -->
    <Modal :open="confirmOpen" :title="confirmTitle" size="sm" @close="confirmOpen = false">
      <p class="confirm-text" :class="{ danger: confirmDanger }">{{ confirmText }}</p>
      <div class="confirm-actions">
        <AppButton variant="text" @click="confirmOpen = false">取消</AppButton>
        <AppButton :variant="confirmDanger ? 'filled' : 'tonal'" :loading="confirmBusy" @click="runConfirm">
          确认
        </AppButton>
      </div>
    </Modal>

    <!-- 重置密码弹窗 -->
    <Modal :open="pwOpen" :title="`重置 ${pwTarget?.username ?? ''} 的密码`" size="sm" @close="pwOpen = false">
      <div class="pw-form">
        <AppInput v-model="pwNew" label="新密码（至少 6 位）" type="password" :maxlength="40" />
        <AppInput v-model="pwConfirm" label="确认新密码" type="password" :maxlength="40" :error="pwError" />
        <p class="pw-hint">重置后该用户的登录态将立即失效。</p>
        <div class="confirm-actions">
          <AppButton variant="text" @click="pwOpen = false">取消</AppButton>
          <AppButton variant="filled" :loading="pwBusy" @click="submitResetPassword">确认重置</AppButton>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.admin {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.card-title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font: var(--type-title-medium-size) / 1.3 var(--font-sans);
  font-weight: 650;
  color: var(--color-on-surface);
}
.search-wrap {
  width: min(280px, 100%);
}

.table-wrap {
  overflow-x: auto;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
}
.user-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  color: var(--color-on-surface-variant);
  font-weight: 600;
  border-bottom: 1px solid var(--color-outline-variant);
  white-space: nowrap;
}
.user-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-outline-variant);
  vertical-align: middle;
}
.user-table tr:last-child td {
  border-bottom: none;
}
.user-table tr.disabled .cell-user,
.user-table tr.disabled .contact {
  opacity: 0.5;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cell-user {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.name {
  font-weight: 600;
  color: var(--color-on-surface);
}
.username {
  color: var(--color-on-surface-variant);
  font-size: 12px;
}
.contact {
  display: flex;
  flex-direction: column;
  color: var(--color-on-surface-variant);
}
.dim {
  color: var(--color-on-surface-variant);
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-admin {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}
.badge-user {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
}
.badge-ok {
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
}
.badge-over {
  background: var(--color-error-container);
  color: var(--color-on-error-container);
}

.ops {
  white-space: nowrap;
}
.op-btns {
  display: flex;
  gap: var(--space-1);
  justify-content: flex-end;
}
.op-btns .danger {
  color: var(--color-error);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.pager-label {
  font: var(--type-label-large-size) / 1.4 var(--font-sans);
  color: var(--color-on-surface-variant);
  font-variant-numeric: tabular-nums;
}

.confirm-text {
  font: var(--type-body-medium-size) / 1.6 var(--font-sans);
  color: var(--color-on-surface);
  margin: 0 0 var(--space-4);
}
.confirm-text.danger {
  color: var(--color-error);
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.pw-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.pw-hint {
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface-variant);
}
</style>
