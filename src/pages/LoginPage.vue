<script setup lang="ts">
/**
 * LoginPage — 登录 / 注册 / 找回密码（公开页，无 AppShell）
 * 注册与找回密码均为邮箱验证码流程：发码 → 验码 → 完成。
 * 支持 ?redirect= 登录后回跳、?u= 切换账号时预填用户名。
 */
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, isEmail, isPhone } from '../composables/useAuth'
import { useUi, type ThemeMode } from '../composables/useUi'
import AppCard from '../components/ui/AppCard.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppInput from '../components/ui/AppInput.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import AppTooltip from '../components/ui/AppTooltip.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const ui = useUi()

type Mode = 'login' | 'register' | 'recovery'
const mode = ref<Mode>('login')
const showPw = ref(false)
const submitting = ref(false)

const form = reactive({
  username: '',
  displayName: '',
  password: '',
  confirm: '',
  email: '',
  code: '',
  phone: '',
})
const errors = reactive({
  username: '',
  displayName: '',
  password: '',
  confirm: '',
  email: '',
  code: '',
  phone: '',
})

/* ---------------- 验证码发送（注册 / 找回共用倒计时） ---------------- */

const CODE_RESEND_SECONDS = 60
const resendLeft = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null

const resendLabel = computed(() => (resendLeft.value > 0 ? `${resendLeft.value}s 后重发` : '获取验证码'))

function startResendCountdown() {
  resendLeft.value = CODE_RESEND_SECONDS
  resendTimer = setInterval(() => {
    resendLeft.value--
    if (resendLeft.value <= 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (resendTimer) clearInterval(resendTimer)
})

async function sendRegisterCode() {
  if (resendLeft.value > 0) return
  if (!isEmail(form.email)) {
    errors.email = '请先填写正确的邮箱'
    return
  }
  errors.email = ''
  errors.code = ''
  try {
    const devCode = await auth.sendRegisterCode(form.email)
    ui.toast(devCode ? `验证码已发送：${devCode}（开发模式）` : `验证码已发送至 ${form.email}`, { duration: 8000 })
    startResendCountdown()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '发送失败，请重试'
    if (msg.includes('邮箱')) errors.email = msg
    else errors.code = msg
    ui.toast(msg)
  }
}

/* ---------------- 找回密码 ---------------- */

const recovery = reactive({ username: '', email: '', code: '', next: '', confirm: '' })
const recoveryStep = ref<1 | 2>(1)
const recoveryErrors = reactive({ username: '', email: '', code: '', next: '', confirm: '' })

function startRecovery() {
  mode.value = 'recovery'
  recoveryStep.value = 1
  recovery.username = form.username
  recovery.email = ''
  recovery.code = ''
  recovery.next = ''
  recovery.confirm = ''
  clearErrors()
}

function backToLogin(prefill = true) {
  mode.value = 'login'
  if (prefill) form.username = recovery.username
  clearErrors()
}

function switchMode(v: string) {
  mode.value = v as Mode
  clearErrors()
}

function clearErrors() {
  errors.username = ''
  errors.displayName = ''
  errors.password = ''
  errors.confirm = ''
  errors.email = ''
  errors.code = ''
  errors.phone = ''
  recoveryErrors.username = ''
  recoveryErrors.email = ''
  recoveryErrors.code = ''
  recoveryErrors.next = ''
  recoveryErrors.confirm = ''
}

/* ---------------- 校验与提交 ---------------- */

function validateLogin(): boolean {
  if (!form.username.trim()) errors.username = '请输入用户名'
  if (!form.password) errors.password = '请输入密码'
  return !errors.username && !errors.password
}

function validateRegister(): boolean {
  if (!/^[a-z0-9_\u4e00-\u9fa5A-Z]{2,20}$/.test(form.username.trim())) {
    errors.username = '2–20 位字母、数字、下划线或中文'
  }
  if (form.password.length < 6) errors.password = '密码至少 6 位'
  if (form.confirm !== form.password) errors.confirm = '两次输入的密码不一致'
  if (!isEmail(form.email)) errors.email = '请填写正确的邮箱，用于接收验证码'
  if (!form.code.trim()) errors.code = '请输入邮箱验证码'
  if (form.phone && !isPhone(form.phone)) errors.phone = '手机号格式不正确'
  return !errors.username && !errors.password && !errors.confirm && !errors.email && !errors.code && !errors.phone
}

async function submit() {
  if (submitting.value) return
  clearErrors()

  if (mode.value === 'login') {
    if (!validateLogin()) return
    submitting.value = true
    try {
      await auth.login({ username: form.username, password: form.password })
      afterAuth('login')
    } catch (e) {
      assignError(e)
    } finally {
      submitting.value = false
    }
    return
  }

  if (mode.value === 'register') {
    if (!validateRegister()) return
    submitting.value = true
    try {
      await auth.register({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        email: form.email,
        code: form.code,
        phone: form.phone,
      })
      afterAuth('register')
    } catch (e) {
      assignError(e)
    } finally {
      submitting.value = false
    }
    return
  }

  /* 找回密码 */
  if (recoveryStep.value === 1) {
    if (!recovery.username.trim()) {
      recoveryErrors.username = '请输入用户名'
      return
    }
    // 用户名存在即进入第二步，具体校验在发码时进行（不暴露账号是否存在）
    recoveryStep.value = 2
    return
  }
  if (!isEmail(recovery.email)) {
    recoveryErrors.email = '请输入该账号绑定的邮箱'
    return
  }
  if (!recovery.code.trim()) {
    recoveryErrors.code = '请输入邮箱验证码'
    return
  }
  if (recovery.next.length < 6) {
    recoveryErrors.next = '新密码至少 6 位'
    return
  }
  if (recovery.next !== recovery.confirm) {
    recoveryErrors.confirm = '两次输入的新密码不一致'
    return
  }
  submitting.value = true
  try {
    await auth.resetPassword({
      email: recovery.email,
      code: recovery.code,
      newPassword: recovery.next,
    })
    ui.toast('密码已重置，请使用新密码登录')
    backToLogin()
  } catch (e) {
    recoveryErrors.code = e instanceof Error ? e.message : '重置失败'
    ui.toast(e instanceof Error ? e.message : '重置失败')
  } finally {
    submitting.value = false
  }
}

async function sendRecoveryCode() {
  if (resendLeft.value > 0) return
  if (!isEmail(recovery.email)) {
    recoveryErrors.email = '请先填写正确的邮箱'
    return
  }
  recoveryErrors.email = ''
  recoveryErrors.code = ''
  try {
    const devCode = await auth.sendResetCode({ username: recovery.username, email: recovery.email })
    ui.toast(devCode ? `验证码已发送：${devCode}（开发模式）` : `验证码已发送至 ${recovery.email}`, { duration: 8000 })
    startResendCountdown()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '发送失败，请重试'
    recoveryErrors.email = msg
    ui.toast(msg)
  }
}

function afterAuth(kind: 'login' | 'register') {
  // 应用该用户保存的界面偏好
  const prefs = auth.getUserPrefs()
  if (prefs?.theme === 'light' || prefs?.theme === 'dark' || prefs?.theme === 'system') {
    ui.setTheme(prefs.theme as ThemeMode)
  }
  if (typeof prefs?.hue === 'number') ui.setHue(prefs.hue)

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  ui.toast(kind === 'login' ? `欢迎回来，${auth.state.session?.displayName}` : '账号创建成功')
  router.push(redirect)
}

function assignError(e: unknown) {
  const msg = e instanceof Error ? e.message : '操作失败，请重试'
  if (msg.includes('用户名')) errors.username = msg
  else if (msg.includes('密码')) errors.password = msg
  else if (msg.includes('邮箱')) errors.email = msg
  else if (msg.includes('手机号')) errors.phone = msg
  else errors.username = msg
  ui.toast(msg)
}

/* ---------------- 主题切换 ---------------- */

const NEXT_THEME: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' }
const themeIcon = { system: 'monitor', light: 'sun', dark: 'moon' } as const
const themeLabel = { system: '跟随系统', light: '浅色模式', dark: '深色模式' } as const

function cycleTheme() {
  ui.setTheme(NEXT_THEME[ui.state.theme])
}

onMounted(() => {
  const u = route.query.u
  if (typeof u === 'string') form.username = u
})
</script>

<template>
  <div class="login-page">
    <div class="theme-float">
      <AppTooltip text="切换主题" position="bottom">
        <button
          class="theme-btn state-layer"
          :aria-label="`主题：${themeLabel[ui.state.theme]}，点击切换`"
          @click="cycleTheme"
        >
          <AppIcon :name="themeIcon[ui.state.theme]" :size="20" />
        </button>
      </AppTooltip>
    </div>

    <div class="login-wrap">
      <div class="brand">
        <span class="brand-logo" aria-hidden="true">
          <AppIcon name="piggy" :size="28" />
        </span>
        <h1 class="brand-name">黄老吉记账</h1>
        <p class="brand-sub">记好每一笔，看清每一天</p>
      </div>

      <AppCard padding="lg" class="login-card">
        <!-- 登录 / 注册 分段（找回密码时隐藏） -->
        <SegmentedControl
          v-if="mode !== 'recovery'"
          :model-value="mode"
          block
          force-full
          class="auth-tabs"
          label="登录或注册"
          :options="[
            { value: 'login', label: '登录' },
            { value: 'register', label: '注册' },
          ]"
          @update:model-value="switchMode"
        />
        <h2 v-else class="recovery-title">
          <button type="button" class="back-btn state-layer" aria-label="返回登录" @click="backToLogin()">
            <AppIcon name="chevron-left" :size="18" />
          </button>
          找回密码
        </h2>

        <form class="login-form" novalidate @submit.prevent="submit">
          <!-- 登录 -->
          <template v-if="mode === 'login'">
            <AppInput
              v-model="form.username"
              label="用户名"
              :maxlength="20"
              :error="errors.username"
              autocomplete="username"
            />
            <AppInput
              v-model="form.password"
              label="密码"
              :type="showPw ? 'text' : 'password'"
              :maxlength="40"
              :error="errors.password"
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
            <div class="form-foot">
              <AppButton type="submit" variant="filled" size="lg" block :loading="submitting">登录</AppButton>
              <button type="button" class="link-btn" @click="startRecovery">忘记密码？</button>
            </div>
          </template>

          <!-- 注册 -->
          <template v-else-if="mode === 'register'">
            <AppInput
              v-model="form.username"
              label="用户名"
              :maxlength="20"
              :error="errors.username"
              autocomplete="username"
            />
            <AppInput
              v-model="form.displayName"
              label="昵称（可选）"
              :maxlength="12"
              :error="errors.displayName"
            />
            <AppInput
              v-model="form.password"
              label="密码"
              :type="showPw ? 'text' : 'password'"
              :maxlength="40"
              :error="errors.password"
              autocomplete="new-password"
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
              v-model="form.confirm"
              label="确认密码"
              :type="showPw ? 'text' : 'password'"
              :maxlength="40"
              :error="errors.confirm"
              autocomplete="new-password"
            />
            <AppInput
              v-model="form.email"
              label="邮箱（必填，用于接收验证码）"
              :maxlength="40"
              :error="errors.email"
              inputmode="email"
              autocomplete="email"
            />
            <AppInput
              v-model="form.code"
              label="邮箱验证码"
              :maxlength="6"
              :error="errors.code"
              inputmode="numeric"
            >
              <template #suffix>
                <button
                  type="button"
                  class="code-btn"
                  :disabled="resendLeft > 0"
                  @click="sendRegisterCode"
                >
                  {{ resendLabel }}
                </button>
              </template>
            </AppInput>
            <AppInput
              v-model="form.phone"
              label="手机号（可选）"
              :maxlength="11"
              :error="errors.phone"
              inputmode="tel"
              autocomplete="tel"
            />
            <AppButton type="submit" variant="filled" size="lg" block :loading="submitting">
              创建账号并登录
            </AppButton>
          </template>

          <!-- 找回密码 -->
          <template v-else>
            <template v-if="recoveryStep === 1">
              <AppInput
                v-model="recovery.username"
                label="用户名"
                :maxlength="20"
                :error="recoveryErrors.username"
              />
              <p class="recovery-hint">下一步将向该账号绑定的邮箱发送验证码，验证通过后即可重置密码。</p>
              <AppButton type="submit" variant="filled" size="lg" block :loading="submitting">下一步</AppButton>
            </template>
            <template v-else>
              <AppInput
                v-model="recovery.email"
                label="绑定邮箱"
                :maxlength="40"
                :error="recoveryErrors.email"
                inputmode="email"
                autocomplete="email"
              />
              <AppInput
                v-model="recovery.code"
                label="邮箱验证码"
                :maxlength="6"
                :error="recoveryErrors.code"
                inputmode="numeric"
              >
                <template #suffix>
                  <button
                    type="button"
                    class="code-btn"
                    :disabled="resendLeft > 0"
                    @click="sendRecoveryCode"
                  >
                    {{ resendLabel }}
                  </button>
                </template>
              </AppInput>
              <AppInput
                v-model="recovery.next"
                label="新密码（至少 6 位）"
                :type="showPw ? 'text' : 'password'"
                :maxlength="40"
                :error="recoveryErrors.next"
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
                v-model="recovery.confirm"
                label="确认新密码"
                :type="showPw ? 'text' : 'password'"
                :maxlength="40"
                :error="recoveryErrors.confirm"
              />
              <AppButton type="submit" variant="filled" size="lg" block :loading="submitting">
                重置密码
              </AppButton>
            </template>
          </template>
        </form>
      </AppCard>

      <p class="hint">
        {{ mode === 'register' ? '注册后账本数据自动同步到云端，换设备登录也不丢。' : '' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--space-6) var(--space-4);
  background:
    radial-gradient(48% 42% at 82% -4%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 70%),
    radial-gradient(42% 38% at 8% 108%, color-mix(in srgb, var(--color-tertiary) 10%, transparent), transparent 70%),
    var(--color-background);
  overflow: hidden;
}

.theme-float {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
}
.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-on-surface-variant);
}

.login-wrap {
  width: min(400px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  animation: pop-in var(--motion-long) var(--ease-emphasized-decelerate);
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}
.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-extra-large);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}
.brand-name {
  font: var(--type-title-large-size) / 1.3 var(--font-sans);
  font-weight: 650;
  color: var(--color-on-surface);
}
.brand-sub {
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.login-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.auth-tabs :deep(.segment) {
  min-height: 44px;
  font-size: 15px;
}

.recovery-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font: var(--type-title-large-size) / 1.3 var(--font-sans);
  font-weight: 650;
  color: var(--color-on-surface);
}
.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--color-on-surface-variant);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.form-foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.link-btn {
  align-self: center;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-small);
  color: var(--color-primary);
  font: var(--type-body-small-size) / 1.5 var(--font-sans);
}

.pw-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.recovery-hint {
  font: var(--type-body-small-size) / 1.6 var(--font-sans);
  color: var(--color-on-surface-variant);
}

.code-btn {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-small);
  color: var(--color-primary);
  font: var(--type-label-medium-size) / 1.4 var(--font-sans);
  white-space: nowrap;
}
.code-btn:disabled {
  color: var(--color-on-surface-variant);
  opacity: 0.6;
}

.hint {
  text-align: center;
  font: var(--type-body-small-size) / 1.6 var(--font-sans);
  color: var(--color-on-surface-variant);
  max-width: 320px;
}

@media (max-width: 359.98px) {
  .login-page {
    padding: var(--space-4) var(--space-3);
  }
}
</style>
