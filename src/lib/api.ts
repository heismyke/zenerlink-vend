// API client for the Zenerlink Vends console. The access token lives in
// memory; the refresh token in localStorage so a reload keeps the session.
// Every request carries the bearer token; the server re-checks the user's
// tenant and staff role on each call, so nothing here is trusted for security.

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const RT_KEY = 'zv_refresh'

export class ApiError extends Error {
  status: number
  code: string
  body: unknown
  constructor(status: number, code: string, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.body = body
  }
}

let access: string | null = null
let onExpired: () => void = () => {}
export const setExpiredHandler = (fn: () => void) => (onExpired = fn)

function readRT(): string | null {
  try {
    return localStorage.getItem(RT_KEY)
  } catch {
    return null
  }
}
function writeRT(v: string | null) {
  try {
    if (v) localStorage.setItem(RT_KEY, v)
    else localStorage.removeItem(RT_KEY)
  } catch {
    /* private mode: the session lasts until the tab closes */
  }
}

export type Session = { access_token: string; refresh_token?: string; user: User; tenant: string }
export type User = { id: string; email: string; name: string; role: string; staff_role?: string; tenant_id: string }

async function raw<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const h: Record<string, string> = { Accept: 'application/json', ...headers }
  if (body !== undefined) h['Content-Type'] = 'application/json'
  if (access) h.Authorization = `Bearer ${access}`
  let res: Response
  try {
    res = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server. Check your connection.')
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const e = data?.error ?? {}
    throw new ApiError(res.status, e.code ?? 'error', e.message ?? `Request failed (${res.status})`, data)
  }
  return data as T
}

let refreshing: Promise<boolean> | null = null
async function refresh(): Promise<boolean> {
  const rt = readRT()
  if (!rt) return false
  refreshing ??= raw<Session>('POST', '/v1/auth/refresh', { refresh_token: rt })
    .then((s) => {
      access = s.access_token
      if (s.refresh_token) writeRT(s.refresh_token)
      return true
    })
    .catch(() => {
      writeRT(null)
      return false
    })
    .finally(() => (refreshing = null))
  return refreshing
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    return await raw<T>(method, path, body)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !path.startsWith('/v1/auth/')) {
      if (await refresh()) return raw<T>(method, path, body)
      access = null
      onExpired()
    }
    throw e
  }
}

export const get = <T>(path: string) => api<T>('GET', path)
export const post = <T>(path: string, body?: unknown) => api<T>('POST', path, body ?? {})
export const patch = <T>(path: string, body: unknown) => api<T>('PATCH', path, body)
export const put = <T>(path: string, body: unknown) => api<T>('PUT', path, body)

export async function login(org: string, email: string, password: string): Promise<Session> {
  const s = await raw<Session>('POST', '/v1/auth/login', { email, password }, { 'X-Tenant': org })
  access = s.access_token
  writeRT(s.refresh_token ?? null)
  return s
}

export async function resume(): Promise<boolean> {
  return access !== null || refresh()
}

export async function logout() {
  const rt = readRT()
  access = null
  writeRT(null)
  if (rt) await raw('POST', '/v1/auth/logout', { refresh_token: rt }).catch(() => undefined)
}

export const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
