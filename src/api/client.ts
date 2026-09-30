/* ============================================================
   API Client — 统一请求封装
   - 响应约定 { code, data, msg }，code!==0 或 HTTP>=400 抛 ApiError(msg)
   - token 存 localStorage；access 过期自动用 refresh 换新并重放请求
   ============================================================ */

const BASE = import.meta.env.VITE_API_BASE ?? '/api'
const TOKENS_KEY = 'hlj-tokens'

export interface Tokens {
  access_token: string
  refresh_token: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

export function saveTokens(t: Tokens | null): void {
  if (t) localStorage.setItem(TOKENS_KEY, JSON.stringify(t))
  else localStorage.removeItem(TOKENS_KEY)
}

let refreshing: Promise<boolean> | null = null

/** 用 refresh token 换新 access token；成功返回 true */
async function refreshTokens(): Promise<boolean> {
  const tokens = loadTokens()
  if (!tokens) return false
  try {
    const resp = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    })
    if (!resp.ok) throw new Error('refresh failed')
    const body = await resp.json()
    if (body.code !== 0) throw new Error(body.msg)
    saveTokens({ access_token: body.data.access_token, refresh_token: body.data.refresh_token })
    return true
  } catch {
    saveTokens(null)
    return false
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** 401 时是否允许走一次 refresh 重放（避免刷新接口自身递归） */
  allowRefresh?: boolean
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, allowRefresh = true } = options
  const tokens = loadTokens()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (tokens) headers.Authorization = `Bearer ${tokens.access_token}`

  const doFetch = () =>
    fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })

  let resp = await doFetch()

  // access 过期：刷新一次并重放
  if (resp.status === 401 && allowRefresh && tokens) {
    refreshing = refreshing ?? refreshTokens()
    const refreshed = await refreshing
    refreshing = null
    if (refreshed) {
      const t2 = loadTokens()
      if (t2) headers.Authorization = `Bearer ${t2.access_token}`
      resp = await doFetch()
    }
  }

  let payload: { code?: number; data?: T; msg?: string } = {}
  try {
    payload = await resp.json()
  } catch {
    /* 非 JSON 响应（如网关错误） */
  }

  if (!resp.ok || (payload.code !== undefined && payload.code !== 0)) {
    throw new ApiError(payload.msg || `请求失败（${resp.status}）`, resp.status)
  }
  return payload.data as T
}
