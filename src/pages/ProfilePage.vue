<script setup lang="ts">
/**
 * ProfilePage — 个人信息
 * 修改头像（上传图片自动居中裁剪并压缩）、昵称与密码（需验证原密码）。
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, isEmail, isPhone } from '../composables/useAuth'
import { useUi } from '../composables/useUi'
import PageHeader from '../components/layout/PageHeader.vue'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppInput from '../components/ui/AppInput.vue'
import Modal from '../components/ui/Modal.vue'
import Avatar from '../components/layout/Avatar.vue'
import AppIcon from '../components/ui/AppIcon.vue'

const router = useRouter()
const auth = useAuth()
const ui = useUi()

const session = auth.state.session
const username = session?.username ?? ''

/* ---------------- 基本信息 ---------------- */

const displayName = ref(session?.displayName ?? '')
const nameError = ref('')
const savingProfile = ref(false)

const avatarSrc = ref(session?.avatar)
const fileInput = ref<HTMLInputElement | null>(null)

/* 联系方式（找回密码用） */
const contacts = reactive({ email: '', phone: '' })
{
  const saved = auth.getContacts()
  contacts.email = saved.email ?? ''
  contacts.phone = saved.phone ?? ''
}
const emailError = ref('')
const phoneError = ref('')

function pickAvatar() {
  fileInput.value?.click()
}

/** 读取图片 → 居中裁剪 → 压缩为 144px JPEG data URL */
function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('仅支持图片文件'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 144
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('图片处理失败'))
          return
        }
        const min = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('图片读取失败'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

async function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    avatarSrc.value = await readImageFile(file)
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '图片处理失败')
  }
}

function removeAvatar() {
  avatarSrc.value = undefined
}

async function saveProfile() {
  nameError.value = ''
  emailError.value = ''
  phoneError.value = ''
  const name = displayName.value.trim()
  const email = contacts.email.trim()
  const phone = contacts.phone.replace(/\s/g, '')
  if (!name) {
    nameError.value = '昵称不能为空'
    return
  }
  if (email && !isEmail(email)) {
    emailError.value = '邮箱格式不正确'
    return
  }
  if (phone && !isPhone(phone)) {
    phoneError.value = '手机号格式不正确'
    return
  }
  savingProfile.value = true
  try {
    await auth.updateProfile({
      displayName: name,
      avatar: avatarSrc.value ?? null,
      email: email || null,
      phone: phone || null,
    })
    refreshBound()
    ui.toast('个人信息已保存')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败，请重试'
    if (msg.includes('邮箱')) emailError.value = msg
    else if (msg.includes('手机号')) phoneError.value = msg
    else ui.toast(msg)
  } finally {
    savingProfile.value = false
  }
}

/* ---------------- 解绑 / 换绑 ---------------- */

/** 当前已绑定的联系方式（服务端真值） */
const bound = reactive({ email: '', phone: '' })

function refreshBound() {
  const saved = auth.getContacts()
  bound.email = saved.email ?? ''
  bound.phone = saved.phone ?? ''
}
refreshBound()

const pendingUnbind = ref<'email' | 'phone' | null>(null)
const unbindOpen = ref(false)
const unbindPw = ref('')
const unbindError = ref('')
const unbindSubmitting = ref(false)
const unbindShowPw = ref(false)

const unbindLabel = computed(() =>
  pendingUnbind.value === 'email' ? '邮箱' : '手机号',
)
/** 解绑后是否两个联系方式都为空（找回密码将不可用） */
const lastContactWarning = computed(() => {
  if (!pendingUnbind.value) return false
  const other = pendingUnbind.value === 'email' ? bound.phone : bound.email
  return !other
})

function askUnbind(field: 'email' | 'phone') {
  pendingUnbind.value = field
  unbindPw.value = ''
  unbindError.value = ''
  unbindOpen.value = true
}

async function confirmUnbind() {
  if (!pendingUnbind.value) return
  unbindError.value = ''
  if (!unbindPw.value) {
    unbindError.value = '请输入登录密码确认'
    return
  }
  unbindSubmitting.value = true
  const ok = await auth.verifyPassword(unbindPw.value)
  if (!ok) {
    unbindError.value = '登录密码不正确'
    unbindSubmitting.value = false
    return
  }
  try {
    if (pendingUnbind.value === 'email') {
      contacts.email = ''
      await auth.updateProfile({ email: null })
    } else {
      contacts.phone = ''
      await auth.updateProfile({ phone: null })
    }
    refreshBound()
    unbindOpen.value = false
    ui.toast(`${unbindLabel.value}已解绑`)
  } catch (e) {
    unbindError.value = e instanceof Error ? e.message : '解绑失败'
  } finally {
    unbindSubmitting.value = false
  }
}

/* ---------------- 修改密码 ---------------- */

const pwForm = reactive({ old: '', next: '', confirm: '' })
const pwErrors = reactive({ old: '', next: '', confirm: '' })
const savingPw = ref(false)
const showPw = ref(false)

async function savePassword() {
  pwErrors.old = ''
  pwErrors.next = ''
  pwErrors.confirm = ''
  if (!pwForm.old) pwErrors.old = '请输入原密码'
  if (pwForm.next.length < 6) pwErrors.next = '新密码至少 6 位'
  if (pwForm.next !== pwForm.confirm) pwErrors.confirm = '两次输入的新密码不一致'
  if (pwErrors.old || pwErrors.next || pwErrors.confirm) return

  savingPw.value = true
  try {
    await auth.changePassword(pwForm.old, pwForm.next)
    ui.toast('密码已修改')
    pwForm.old = ''
    pwForm.next = ''
    pwForm.confirm = ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : '修改失败'
    if (msg.includes('原密码')) pwErrors.old = msg
    else pwErrors.next = msg
  } finally {
    savingPw.value = false
  }
}

/* ---------------- 退出登录 ---------------- */

function logout() {
  auth.logout()
  ui.toast('已退出登录')
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="profile page">
    <PageHeader title="个人信息" description="管理你的头像、昵称与登录密码" />

    <!-- 基本信息 -->
    <AppCard padding="lg" class="section">
      <h2 class="section-title">
        <AppIcon name="user" :size="18" aria-hidden="true" />
        基本信息
      </h2>

      <div class="avatar-row">
        <Avatar :name="displayName" :src="avatarSrc" :size="88" />
        <div class="avatar-actions">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="sr-only"
            aria-label="选择头像图片"
            @change="onAvatarChange"
          />
          <AppButton variant="tonal" size="sm" icon="upload" @click="pickAvatar">上传头像</AppButton>
          <AppButton v-if="avatarSrc" variant="text" size="sm" @click="removeAvatar">移除</AppButton>
          <p class="avatar-hint">支持 JPG / PNG，自动裁剪为圆形</p>
        </div>
      </div>

      <div class="field-grid">
        <div class="readonly-field">
          <span class="readonly-label">用户名</span>
          <span class="readonly-value numeric">@{{ username }}</span>
          <p class="readonly-hint">用户名作为登录标识，暂不支持修改</p>
        </div>
        <AppInput v-model="displayName" label="昵称" :maxlength="12" :error="nameError" />
      </div>

      <!-- 联系方式绑定管理 -->
      <div class="bind-grid">
        <div class="bind-field">
          <div class="bind-head">
            <span class="bind-label">邮箱</span>
            <span class="bind-status" :class="{ on: !!bound.email }">
              <AppIcon :name="bound.email ? 'check-circle' : 'info'" :size="13" aria-hidden="true" />
              {{ bound.email ? '已绑定' : '未绑定' }}
            </span>
            <button
              v-if="bound.email"
              type="button"
              class="unbind-btn"
              @click="askUnbind('email')"
            >
              解绑
            </button>
          </div>
          <AppInput
            v-model="contacts.email"
            :label="bound.email ? '绑定新邮箱后保存即可换绑' : '输入邮箱并保存完成绑定'"
            :maxlength="40"
            :error="emailError"
            inputmode="email"
          />
        </div>

        <div class="bind-field">
          <div class="bind-head">
            <span class="bind-label">手机号</span>
            <span class="bind-status" :class="{ on: !!bound.phone }">
              <AppIcon :name="bound.phone ? 'check-circle' : 'info'" :size="13" aria-hidden="true" />
              {{ bound.phone ? '已绑定' : '未绑定' }}
            </span>
            <button
              v-if="bound.phone"
              type="button"
              class="unbind-btn"
              @click="askUnbind('phone')"
            >
              解绑
            </button>
          </div>
          <AppInput
            v-model="contacts.phone"
            :label="bound.phone ? '绑定新手机号后保存即可换绑' : '输入手机号并保存完成绑定'"
            :maxlength="11"
            :error="phoneError"
            inputmode="tel"
          />
        </div>
      </div>

      <p class="contact-hint">绑定邮箱或手机号后，可在登录页通过「忘记密码」自助重置密码；解绑需输入登录密码确认。</p>

      <div class="section-actions">
        <AppButton variant="filled" :loading="savingProfile" @click="saveProfile">保存基本信息</AppButton>
      </div>
    </AppCard>

    <!-- 修改密码 -->
    <AppCard padding="lg" class="section">
      <h2 class="section-title">
        <AppIcon name="key" :size="18" aria-hidden="true" />
        修改密码
      </h2>
      <div class="pw-form">
        <AppInput
          v-model="pwForm.old"
          label="原密码"
          :type="showPw ? 'text' : 'password'"
          :error="pwErrors.old"
          autocomplete="current-password"
        >
          <template #suffix>
            <button
              type="button"
              class="pw-toggle"
              :aria-label="showPw ? '隐藏密码' : '显示密码'"
              @click="showPw = !showPw"
            >
              <AppIcon :name="showPw ? 'eye-off' : 'eye'" :size="18" />
            </button>
          </template>
        </AppInput>
        <AppInput
          v-model="pwForm.next"
          label="新密码（至少 6 位）"
          :type="showPw ? 'text' : 'password'"
          :error="pwErrors.next"
          autocomplete="new-password"
        />
        <AppInput
          v-model="pwForm.confirm"
          label="确认新密码"
          :type="showPw ? 'text' : 'password'"
          :error="pwErrors.confirm"
          autocomplete="new-password"
        />
        <div class="section-actions">
          <AppButton variant="filled" :loading="savingPw" @click="savePassword">修改密码</AppButton>
        </div>
      </div>
    </AppCard>

    <!-- 退出登录 -->
    <AppCard padding="lg" class="section">
      <h2 class="section-title">
        <AppIcon name="close" :size="18" aria-hidden="true" />
        账号
      </h2>
      <div class="row">
        <div class="row-text">
          <p class="row-title">退出登录</p>
          <p class="row-desc">退出后需要重新输入用户名与密码才能进入。</p>
        </div>
        <AppButton variant="outlined" @click="logout">退出登录</AppButton>
      </div>
    </AppCard>

    <!-- 解绑确认 -->
    <Modal :open="unbindOpen" :title="`解绑${unbindLabel}`" size="sm" @close="unbindOpen = false">
      <div class="unbind-body">
        <p class="unbind-text">
          解绑后，将无法通过该{{ unbindLabel }}找回密码。<template v-if="lastContactWarning"><strong>这是你唯一的找回方式，解绑后自助找回将不可用。</strong></template>
        </p>
        <p class="unbind-text">输入登录密码确认本次操作。</p>
        <AppInput
          v-model="unbindPw"
          label="登录密码"
          :type="unbindShowPw ? 'text' : 'password'"
          :error="unbindError"
          autocomplete="current-password"
        >
          <template #suffix>
            <button
              type="button"
              class="pw-toggle"
              :aria-label="unbindShowPw ? '隐藏密码' : '显示密码'"
              @click="unbindShowPw = !unbindShowPw"
            >
              <AppIcon :name="unbindShowPw ? 'eye-off' : 'eye'" :size="18" />
            </button>
          </template>
        </AppInput>
      </div>
      <template #footer>
        <AppButton variant="text" @click="unbindOpen = false">取消</AppButton>
        <AppButton variant="danger" :loading="unbindSubmitting" @click="confirmUnbind">确认解绑</AppButton>
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

.avatar-row {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}
.avatar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}
.avatar-hint {
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.readonly-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.readonly-label {
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  color: var(--color-on-surface-variant);
}
.readonly-value {
  font-size: var(--type-body-large-size);
  color: var(--color-on-surface);
}
.readonly-hint {
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.contact-hint {
  font: var(--type-body-small-size) / 1.6 var(--font-sans);
  color: var(--color-on-surface-variant);
  background: var(--color-surface-container-high);
  border-radius: var(--radius-medium);
  padding: var(--space-3) var(--space-4);
}

.bind-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
}
.bind-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.bind-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.bind-label {
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
  font-weight: var(--type-label-medium-weight);
  color: var(--color-on-surface);
}
.bind-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  font: var(--type-label-small-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface-variant);
  background: var(--color-surface-container-high);
}
.bind-status.on {
  color: var(--color-success);
  background: var(--color-success-container);
}
.unbind-btn {
  margin-left: auto;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-small);
  color: var(--color-error);
  font: var(--type-label-medium-size) / 1.5 var(--font-sans);
  transition: background-color var(--motion-fast) var(--ease-standard);
}
@media (hover: hover) {
  .unbind-btn:hover {
    background: var(--color-error-container);
  }
}

.unbind-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.unbind-text {
  font: var(--type-body-medium-size) / 1.7 var(--font-sans);
  color: var(--color-on-surface);
}
.unbind-text strong {
  color: var(--color-error);
  font-weight: 600;
}

.section-actions {
  display: flex;
  justify-content: flex-end;
}

.pw-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.pw-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
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

@media (min-width: 600px) {
  .field-grid {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
</style>
