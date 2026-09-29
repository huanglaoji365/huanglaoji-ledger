/* ============================================================
   Auth Store — 登录会话（前端演示版）
   账号保存在本机浏览器，密码 SHA-256 哈希存储；
   接入 FastAPI 后：register/login/logout 换成 API 调用，
   会话改为 access/refresh token，其余 UI 无需变动。
   ============================================================ */

import { readonly, reactive } from 'vue'

export interface SessionUser {
  username: string
  displayName: string
  /** 头像（data URL，base64） */
  avatar?: string
}

export interface UserPrefs {
  theme?: string
  hue?: number
}

interface StoredUser extends SessionUser {
  passHash: string
  /** 找回密码联系方式（至少绑定一项才能自助找回） */
  email?: string
  phone?: string
  prefs?: UserPrefs
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

const USERS_KEY = 'hlj-users'
const SESSION_KEY = 'hlj-session'

function loadUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}') as Record<string, StoredUser>
  } catch {
    return {}
  }
}

function saveUsers(users: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

interface AuthState {
  session: SessionUser | null
}

function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as { username: string }
    const user = loadUsers()[s.username]
    if (!user) return null
    return {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
    }
  } catch {
    return null
  }
}

const state = reactive<AuthState>({ session: loadSession() })

async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`hlj:${pw}`))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function signIn(username: string) {
  const user = loadUsers()[username]!
  state.session = {
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, at: Date.now() }))
}

export function useAuth() {
  return {
    state: readonly(state) as Readonly<AuthState>,

    async register(input: {
      username: string
      displayName?: string
      password: string
      email?: string
      phone?: string
    }): Promise<void> {
      const username = input.username.trim().toLowerCase()
      if (!/^[a-z0-9_\u4e00-\u9fa5]{2,20}$/.test(username)) {
        throw new Error('用户名需为 2–20 位字母、数字、下划线或中文')
      }
      const email = input.email?.trim()
      const phone = input.phone?.replace(/\s/g, '')
      if (email && !isEmail(email)) throw new Error('邮箱格式不正确')
      if (phone && !isPhone(phone)) throw new Error('手机号格式不正确')
      const users = loadUsers()
      if (users[username]) throw new Error('该用户名已被注册')
      users[username] = {
        username,
        displayName: input.displayName?.trim() || input.username.trim(),
        passHash: await hashPassword(input.password),
        email: email || undefined,
        phone: phone || undefined,
      }
      saveUsers(users)
      signIn(username)
    },

    async login(input: { username: string; password: string }): Promise<void> {
      const users = loadUsers()
      const user = users[input.username.trim().toLowerCase()]
      if (!user) throw new Error('账号不存在，请先注册')
      if (user.passHash !== (await hashPassword(input.password))) throw new Error('密码不正确')
      signIn(user.username)
    },

    /** 退出并返回被退出的会话（切换账号时可预填用户名） */
    logout(): SessionUser | null {
      const current = state.session
      state.session = null
      localStorage.removeItem(SESSION_KEY)
      return current
    },

    /** 更新个人资料：昵称 / 头像（avatar 传 null 表示移除头像）/ 联系方式 */
    updateProfile(patch: {
      displayName?: string
      avatar?: string | null
      email?: string | null
      phone?: string | null
    }): void {
      if (!state.session) return
      const users = loadUsers()
      const user = users[state.session.username]
      if (!user) return
      if (patch.displayName !== undefined) {
        user.displayName = patch.displayName.trim() || user.displayName
      }
      if (patch.avatar !== undefined) {
        user.avatar = patch.avatar || undefined
      }
      if (patch.email !== undefined) {
        user.email = patch.email || undefined
      }
      if (patch.phone !== undefined) {
        user.phone = patch.phone || undefined
      }
      saveUsers(users)
      state.session = {
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      }
    },

    /** 当前登录用户的联系方式 */
    getContacts(): { email?: string; phone?: string } {
      if (!state.session) return {}
      const user = loadUsers()[state.session.username]
      return { email: user?.email, phone: user?.phone }
    },

    /** 找回密码第一步：查询账号绑定的联系方式（不存在返回 null） */
    getRecoveryHint(username: string): { email?: string; phone?: string } | null {
      const user = loadUsers()[username.trim().toLowerCase()]
      if (!user) return null
      return { email: user.email, phone: user.phone }
    },

    /** 找回密码第二步：校验联系方式后重置密码（演示版，无验证码通道） */
    async resetPassword(input: { username: string; contact: string; newPassword: string }): Promise<void> {
      const users = loadUsers()
      const user = users[input.username.trim().toLowerCase()]
      if (!user) throw new Error('账号不存在')
      const contact = input.contact.trim().toLowerCase()
      if (!contact) throw new Error('请输入绑定的邮箱或手机号')
      const matched =
        (user.email && contact === user.email.toLowerCase()) ||
        (user.phone && contact === user.phone)
      if (!matched) throw new Error('邮箱或手机号与该账号不匹配')
      if (input.newPassword.length < 6) throw new Error('新密码至少 6 位')
      user.passHash = await hashPassword(input.newPassword)
      saveUsers(users)
    },

    /** 校验登录密码（解绑等敏感操作确认用） */
    async verifyPassword(password: string): Promise<boolean> {
      if (!state.session) return false
      const user = loadUsers()[state.session.username]
      if (!user) return false
      return user.passHash === (await hashPassword(password))
    },

    /** 修改密码（已登录）：校验原密码后更新哈希 */
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
      if (!state.session) throw new Error('未登录')
      const users = loadUsers()
      const user = users[state.session.username]
      if (!user) throw new Error('未登录')
      if (user.passHash !== (await hashPassword(oldPassword))) throw new Error('原密码不正确')
      if (newPassword.length < 6) throw new Error('新密码至少 6 位')
      user.passHash = await hashPassword(newPassword)
      saveUsers(users)
    },

    getUserPrefs(): UserPrefs | null {
      if (!state.session) return null
      return loadUsers()[state.session.username]?.prefs ?? null
    },

    savePrefs(prefs: UserPrefs) {
      if (!state.session) return
      const users = loadUsers()
      const user = users[state.session.username]
      if (!user) return
      user.prefs = { ...user.prefs, ...prefs }
      saveUsers(users)
    },
  }
}
