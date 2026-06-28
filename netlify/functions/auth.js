const crypto = require('crypto')
const { connectLambda, getStore } = require('@netlify/blobs')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return empty(204)
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  connectLambda(event)
  const store = getStore('shine-cabin')

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const mode = body.mode === 'register' ? 'register' : 'login'
  const method = body.method
  const identifier = normalize(body.identifier)
  const password = typeof body.password === 'string' ? body.password : ''
  const name = normalize(body.name)

  if (method !== 'email') {
    return json(400, { error: '仅支持邮箱登录' })
  }
  if (!identifier) return json(400, { error: '请输入邮箱' })
  if (password.length < 6) return json(400, { error: '密码至少 6 位' })

  const userKey = `users/${method}-${sha(identifier)}`
  const existing = await store.get(userKey, { type: 'json' })

  if (mode === 'register') {
    if (existing) return json(409, { error: '账号已存在，请直接登录' })
    const salt = crypto.randomBytes(16).toString('hex')
    const user = {
      id: crypto.randomUUID(),
      method,
      identifierHash: sha(identifier),
      displayName: name || maskIdentifier(identifier, method),
      passwordSalt: salt,
      passwordHash: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await store.setJSON(userKey, user)
    return createSession(store, user)
  }

  if (!existing) return json(404, { error: '账号不存在，请先注册' })
  if (existing.passwordHash !== hashPassword(password, existing.passwordSalt)) {
    return json(401, { error: '密码错误' })
  }
  return createSession(store, existing)
}

async function createSession(store, user) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const session = {
    token,
    userId: user.id,
    displayName: user.displayName,
    method: user.method,
    expiresAt,
    createdAt: new Date().toISOString(),
  }
  await store.setJSON(`sessions/${token}`, session)
  return json(200, {
    session: {
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.displayName,
        method: user.method,
      },
    },
  })
}

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
}

function maskIdentifier(identifier, method) {
  const [name, domain] = identifier.split('@')
  if (!domain) return identifier
  return `${name.slice(0, 2)}***@${domain}`
}

function empty(statusCode) {
  return { statusCode, headers: corsHeaders(), body: '' }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
