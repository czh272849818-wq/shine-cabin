export type AuthMode = 'login' | 'register'
export type AuthMethod = 'email'

export type UserSession = {
  token: string
  expiresAt: string
  user: {
    id: string
    name: string
    method: AuthMethod
  }
}

export type Lead = {
  id: string
  name: string
  source: string
  level: 'A' | 'B' | 'C'
  status: string
  need: string
  createdAt: string
}

export type WorkspaceMetrics = {
  plays: number
  followers: number
  engagementRate: number
  completionRate: number
  conversions: number
  deals: number
}

export type ContentSignal = {
  id: string
  title: string
  signal: string
  completionRate: number
  createdAt: string
}

export type WorkspaceData = {
  leads: Lead[]
  metrics: WorkspaceMetrics
  contents: ContentSignal[]
  createdAt: string
  updatedAt: string
}

export const SESSION_KEY = 'shine_cabin_session'

export const emptyWorkspace = (): WorkspaceData => {
  const now = new Date().toISOString()
  return {
    leads: [],
    metrics: {
      plays: 0,
      followers: 0,
      engagementRate: 0,
      completionRate: 0,
      conversions: 0,
      deals: 0,
    },
    contents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function getSession(): UserSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as UserSession
    if (!parsed.token || new Date(parsed.expiresAt).getTime() < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: UserSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function authenticate(input: {
  mode: AuthMode
  method: AuthMethod
  identifier: string
  password: string
  name?: string
}): Promise<UserSession> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok) throw new Error(extractError(json, res.statusText))
  return json.session as UserSession
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  const session = getSession()
  if (!session) return emptyWorkspace()
  const res = await fetch('/api/workspace', {
    headers: { Authorization: `Bearer ${session.token}` },
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok) throw new Error(extractError(json, res.statusText))
  return normalizeWorkspace(json)
}

export async function saveWorkspace(data: WorkspaceData): Promise<WorkspaceData> {
  const session = getSession()
  if (!session) throw new Error('请先登录')
  const next = { ...data, updatedAt: new Date().toISOString() }
  const res = await fetch('/api/workspace', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(next),
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok) throw new Error(extractError(json, res.statusText))
  const workspace = normalizeWorkspace(json)
  window.dispatchEvent(new Event('shine-cabin-workspace-updated'))
  return workspace
}

export function normalizeWorkspace(input: Partial<WorkspaceData> | null | undefined): WorkspaceData {
  const empty = emptyWorkspace()
  return {
    ...empty,
    ...input,
    leads: Array.isArray(input?.leads) ? input.leads : [],
    metrics: { ...empty.metrics, ...(input?.metrics || {}) },
    contents: Array.isArray(input?.contents) ? input.contents : [],
  }
}

function extractError(body: any, fallback: string) {
  if (typeof body?.error === 'string') return body.error
  if (typeof body?.message === 'string') return body.message
  return fallback || '请求失败'
}
