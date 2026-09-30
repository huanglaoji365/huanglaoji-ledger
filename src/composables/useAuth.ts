/* ============================================================
   Auth Store — 登录会话（后端版）
   全部走 /api/auth 与 /api/users 接口；token 与会话存浏览器。
   注册 = 邮箱验证码验证后创建账号；找回密码 = 邮箱验证码重置。
   ============================================================ */

import { readonly, reactive } from 'vue'
import { api, loadTokens, saveTokens, type Tokens } from '../api/client'
import { useLedger } from './useLedger'

export interface SessionUser {
  username: string
  displayName: string
  /** 头像（data URL） */
  avatar?: string
  email?: string
  phone?: string
  /** 'user' | 'admin' */
  role: string
}

export interface UserPrefs {
  theme?: string
  hue?: number
}

/* ---------------- 校验与打码工具 ---------------- */

export const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim())
export const isPhone = (v: string) => /^1[3-9]\d{9}$/.test(v.trim())

export function maskEmail(v: string): string {
  const [name, domain] = v.split('@')
  if (!domain) return v
  const head = name.slice(0, Math.min(2, name.length))
  return `${head}${'*'.repeat(Math.max(2, name.length - head.length))}@${domain}`
}

export function maskPhone(v: string): string {
  return v.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

interface AuthState {
  session: SessionUser | null
  prefs: UserPrefs | null
  /** 启动恢复会话进行中（防止守卫闪烁跳转） */
  booting: boolean
}

const SESSION_KEY = 'hlj-session'

function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

const state = reactive<AuthState>({ session: loadSession(), prefs: null, booting: false })

function persistSession(u: SessionUser | null) {
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u))
  else localStorage.removeItem(SESSION_KEY)
}

interface TokenPairResponse {
  access_token: string
  refresh_token: string
  user: {
    username: string
    displayName: string
    avatar?: string | null
    email?: string | null
    phone?: string | null
    role?: string
  }
}

function toSessionUser(u: TokenPairResponse['user']): SessionUser {
  return {
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar ?? undefined,
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    role: u.role ?? 'user',
  }
}

function applyAuth(resp: TokenPairResponse) {
  saveTokens({ access_token: resp.access_token, refresh_token: resp.refresh_token })
  const session = toSessionUser(resp.user)
  state.session = session
  persistSession(session)
  // 登录后拉取账本数据与偏好（偏好先于登录页的 afterAuth 应用）
  void useLedger().loadAll()
}

async function refreshPrefs(): Promise<void> {
  if (!state.session) return
  try {
    state.prefs = await api<UserPrefs>('/users/me/prefs')
  } catch {
    state.prefs = null
  }
}

export function useAuth() {
  return {
    state: readonly(state) as Readonly<AuthState>,

    /** 应用启动时调用：有 token 则恢复会话并拉取数据 */
    async bootstrap(): Promise<void> {
      if (!loadTokens()) return
      state.booting = true
      try {
        const user = await api<TokenPairResponse['user']>('/users/me')
        const session = toSessionUser(user)
        state.session = session
        persistSession(session)
        void useLedger().loadAll()
        void refreshPrefs()
      } catch {
        saveTokens(null)
        persistSession(null)
        state.session = null
      } finally {
        state.booting = false
      }
    },

    /** 注册第一步：向邮箱发送验证码；返回 dev_code（仅开发环境） */
    async sendRegisterCode(email: string): Promise<string | undefined> {
      const resp = await api<{ sent: boolean; dev_code?: string }>('/auth/register/code', {
        method: 'POST',
        body: { email: email.trim() },
      })
      return resp.dev_code
    },

    async register(input: {
      username: string
      displayName?: string
      password: string
      email: string
      code: string
      phone?: string
    }): Promise<void> {
      const username = input.username.trim().toLowerCase()
      if (!/^[a-z0-9_\u4e00-\u9fa5]{2,20}$/.test(username)) {
        throw new Error('用户名需为 2–20 位字母、数字、下划线或中文')
      }
      const email = input.email.trim()
      if (!isEmail(email)) throw new Error('邮箱格式不正确')
      if (!input.code.trim()) throw new Error('请输入邮箱验证码')
      if (input.phone && !isPhone(input.phone)) throw new Error('手机号格式不正确')
      const resp = await api<TokenPairResponse>('/auth/register', {
        method: 'POST',
        body: {
          username,
          password: input.password,
          email,
          code: input.code.trim(),
          display_name: input.displayName?.trim() || undefined,
          phone: input.phone?.replace(/\s/g, '') || undefined,
        },
      })
      applyAuth(resp)
      await refreshPrefs()
    },

    async login(input: { username: string; password: string }): Promise<void> {
      const resp = await api<TokenPairResponse>('/auth/login', {
        method: 'POST',
        body: { username: input.username.trim().toLowerCase(), password: input.password },
      })
      applyAuth(resp)
      await refreshPrefs()
    },

    /** 退出并返回被退出的会话（切换账号时可预填用户名） */
    logout(): SessionUser | null {
      const current = state.session
      const tokens = loadTokens()
      if (tokens) {
        void api('/auth/logout', { method: 'POST', body: { refresh_token: tokens.refresh_token } }).catch(() => {})
      }
      state.session = null
      state.prefs = null
      saveTokens(null)
      persistSession(null)
      useLedger().clear()
      return current
    },

    /** 更新个人资料：昵称 / 头像（avatar 传 null 表示移除头像）/ 联系方式 */
    async updateProfile(patch: {
      displayName?: string
      avatar?: string | null
      email?: string | null
      phone?: string | null
    }): Promise<void> {
      if (!state.session) return
      const body: Record<string, unknown> = {}
      if (patch.displayName !== undefined) body.display_name = patch.displayName.trim()
      if (patch.avatar !== undefined) body.avatar = patch.avatar
      if (patch.email !== undefined) body.email = patch.email
      if (patch.phone !== undefined) body.phone = patch.phone
      const user = await api<TokenPairResponse['user']>('/users/me', { method: 'PATCH', body })
      state.session = toSessionUser(user)
      persistSession(state.session)
    },

    /** 当前登录用户的联系方式 */
    getContacts(): { email?: string; phone?: string } {
      if (!state.session) return {}
      return { email: state.session.email, phone: state.session.phone }
    },

    /** 找回密码：验证用户名与邮箱匹配后发送验证码；返回 dev_code（仅开发环境） */
    async sendResetCode(input: { username: string; email: string }): Promise<string | undefined> {
      const resp = await api<{ sent: boolean; dev_code?: string }>('/auth/password/reset-code', {
        method: 'POST',
        body: { username: input.username.trim().toLowerCase(), email: input.email.trim() },
      })
      return resp.dev_code
    },

    /** 找回密码：邮箱验证码校验通过后重置 */
    async resetPassword(input: { email: string; code: string; newPassword: string }): Promise<void> {
      await api('/auth/password/reset', {
        method: 'POST',
        body: { email: input.email.trim(), code: input.code.trim(), new_password: input.newPassword },
      })
    },

    /** 校验登录密码（解绑等敏感操作确认用） */
    async verifyPassword(password: string): Promise<boolean> {
      if (!state.session) return false
      const resp = await api<{ valid: boolean }>('/auth/verify-password', {
        method: 'POST',
        body: { password },
      })
      return resp.valid
    },

    /** 修改密码（已登录）：校验原密码后更新；成功后需重新登录 */
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
      if (newPassword.length < 6) throw new Error('新密码至少 6 位')
      await api('/auth/password', {
        method: 'PUT',
        body: { old_password: oldPassword, new_password: newPassword },
      })
    },

    getUserPrefs(): UserPrefs | null {
      return state.prefs
    },

    async savePrefs(prefs: UserPrefs): Promise<void> {
      if (!state.session) return
      state.prefs = { ...(state.prefs ?? {}), ...prefs }
      try {
        await api<UserPrefs>('/users/me/prefs', { method: 'PUT', body: prefs })
      } catch {
        /* 偏好同步失败不打断 UI */
      }
    },
  }
}
