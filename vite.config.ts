import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import * as crypto from 'crypto'

type UserRecord = {
  id: string
  method: 'email'
  displayName: string
  passwordSalt: string
  passwordHash: string
}

type SessionRecord = {
  token: string
  userId: string
  displayName: string
  method: 'email'
  expiresAt: string
}

function llmProxyPlugin(apiKey: string | undefined): Plugin {
  let runtimeKey: string | undefined
  const users = new Map<string, UserRecord>()
  const sessions = new Map<string, SessionRecord>()
  const workspaces = new Map<string, unknown>()

  return {
    name: 'llm-proxy',
    configureServer(server) {
      const getApiKey = () => process.env.DEEPSEEK_API_KEY || apiKey || runtimeKey

      server.middlewares.use('/api/llm/health', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const key = getApiKey()
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            hasKey: Boolean(key),
            hasProcessEnvKey: Boolean(process.env.DEEPSEEK_API_KEY),
            source: process.env.DEEPSEEK_API_KEY ? 'processEnv' : apiKey ? 'envFile' : runtimeKey ? 'runtime' : null,
          })
        )
      })

      server.middlewares.use('/api/llm/key', (req, res) => {
        if (req.method === 'DELETE') {
          runtimeKey = undefined
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { apiKey?: unknown }
            if (typeof body.apiKey !== 'string' || body.apiKey.trim().length < 10) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid apiKey' }))
              return
            }
            runtimeKey = body.apiKey.trim()
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Invalid JSON' }))
          }
        })
      })

      server.middlewares.use('/api/llm/chat', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const key = getApiKey()
        if (!key) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing DEEPSEEK_API_KEY' }))
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        req.on('end', async () => {
          try {
            const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
              },
              body: Buffer.concat(chunks),
            })

            const contentType = upstream.headers.get('content-type') ?? 'application/json'
            const text = await upstream.text()

            if (!upstream.ok) {
              let message = upstream.statusText
              try {
                const j = JSON.parse(text) as any
                if (typeof j?.error === 'string') message = j.error
                else if (typeof j?.error?.message === 'string') message = j.error.message
                else if (typeof j?.message === 'string') message = j.message
              } catch {}

              if (upstream.status === 401) {
                message = `Unauthorized：DeepSeek Key 无效/已过期/权限不足。请在右下角 AI助手里重新“临时配置 Key”，或用环境变量方式重启 dev server。`
              }

              res.statusCode = upstream.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: message, status: upstream.status }))
              return
            }

            res.statusCode = upstream.status
            res.setHeader('Content-Type', contentType)
            res.end(text)
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }))
          }
        })
        req.on('error', () => {
          next()
        })
      })

      server.middlewares.use('/api/llm/chat-stream', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const key = getApiKey()
        if (!key) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing DEEPSEEK_API_KEY' }))
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        req.on('end', async () => {
          try {
            const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
              },
              body: Buffer.concat(chunks),
            })

            if (!upstream.ok || !upstream.body) {
              const contentType = upstream.headers.get('content-type') ?? 'application/json'
              const text = await upstream.text()
              if (!upstream.ok) {
                let message = upstream.statusText
                try {
                  const j = JSON.parse(text) as any
                  if (typeof j?.error === 'string') message = j.error
                  else if (typeof j?.error?.message === 'string') message = j.error.message
                  else if (typeof j?.message === 'string') message = j.message
                } catch {}
                if (upstream.status === 401) {
                  message = 'Unauthorized：DeepSeek Key 无效/已过期/权限不足。请更新 Netlify 环境变量后重新部署。'
                }
                res.statusCode = upstream.status
                res.setHeader('Content-Type', contentType)
                res.end(JSON.stringify({ error: message, status: upstream.status }))
                return
              }
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            res.setHeader('Connection', 'keep-alive')
            ;(res as any).flushHeaders?.()

            const reader = upstream.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            const sendEvent = (data: string) => {
              res.write(`data: ${data}\n\n`)
            }

            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              let boundaryIndex = buffer.indexOf('\n\n')
              while (boundaryIndex !== -1) {
                const block = buffer.slice(0, boundaryIndex).trim()
                buffer = buffer.slice(boundaryIndex + 2)
                if (block) sendEvent(block)
                boundaryIndex = buffer.indexOf('\n\n')
              }
            }

            const trailing = buffer.trim()
            if (trailing) sendEvent(trailing)
            sendEvent('[DONE]')
            res.end()
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }))
          }
        })
        req.on('error', () => {
          next()
        })
      })

      server.middlewares.use('/api/auth', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method Not Allowed' })
          return
        }
        readJson(req)
          .then((body) => {
            const mode = body.mode === 'register' ? 'register' : 'login'
            const method = body.method
            const identifier = normalize(body.identifier)
            const password = typeof body.password === 'string' ? body.password : ''
            const name = normalize(body.name)
            if (method !== 'email') {
              sendJson(res, 400, { error: '仅支持邮箱登录' })
              return
            }
            if (!identifier) {
              sendJson(res, 400, { error: '请输入邮箱' })
              return
            }
            if (password.length < 6) {
              sendJson(res, 400, { error: '密码至少 6 位' })
              return
            }
            const userKey = `${method}-${sha(identifier)}`
            const existing = users.get(userKey)
            if (mode === 'register') {
              if (existing) {
                sendJson(res, 409, { error: '账号已存在，请直接登录' })
                return
              }
              const salt = crypto.randomBytes(16).toString('hex')
              const user: UserRecord = {
                id: crypto.randomUUID(),
                method,
                displayName: name || maskIdentifier(identifier, method),
                passwordSalt: salt,
                passwordHash: hashPassword(password, salt),
              }
              users.set(userKey, user)
              sendJson(res, 200, { session: createSession(sessions, user) })
              return
            }
            if (!existing) {
              sendJson(res, 404, { error: '账号不存在，请先注册' })
              return
            }
            if (existing.passwordHash !== hashPassword(password, existing.passwordSalt)) {
              sendJson(res, 401, { error: '密码错误' })
              return
            }
            sendJson(res, 200, { session: createSession(sessions, existing) })
          })
          .catch((e) => sendJson(res, 400, { error: e instanceof Error ? e.message : 'Invalid JSON' }))
      })

      server.middlewares.use('/api/workspace', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        const session = readLocalSession(sessions, req.headers.authorization)
        if (!session) {
          sendJson(res, 401, { error: '请先登录' })
          return
        }
        if (req.method === 'GET') {
          sendJson(res, 200, workspaces.get(session.userId) || emptyWorkspace())
          return
        }
        if (req.method !== 'PUT') {
          sendJson(res, 405, { error: 'Method Not Allowed' })
          return
        }
        readJson(req)
          .then((body) => {
            const next = { ...emptyWorkspace(), ...body, updatedAt: new Date().toISOString() }
            workspaces.set(session.userId, next)
            sendJson(res, 200, next)
          })
          .catch((e) => sendJson(res, 400, { error: e instanceof Error ? e.message : 'Invalid JSON' }))
      })
    },
  }
}

function readJson(req: import('http').IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: import('http').ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function normalize(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function sha(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
}

function maskIdentifier(identifier: string, method: 'email') {
  const [name, domain] = identifier.split('@')
  return domain ? `${name.slice(0, 2)}***@${domain}` : identifier
}

function createSession(sessions: Map<string, SessionRecord>, user: UserRecord) {
  const token = crypto.randomBytes(32).toString('hex')
  const session = {
    token,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    user: { id: user.id, name: user.displayName, method: user.method },
  }
  sessions.set(token, { token, userId: user.id, displayName: user.displayName, method: user.method, expiresAt: session.expiresAt })
  return session
}

function readLocalSession(sessions: Map<string, SessionRecord>, authorization: string | undefined) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : ''
  if (!token) return null
  const session = sessions.get(token)
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null
  return session
}

function emptyWorkspace() {
  const now = new Date().toISOString()
  return {
    leads: [],
    metrics: { plays: 0, followers: 0, engagementRate: 0, completionRate: 0, conversions: 0, deals: 0 },
    contents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  const apiKey = env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY
  return {
    plugins: [react(), llmProxyPlugin(apiKey)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  }
})
