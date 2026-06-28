const { stream } = require('@netlify/functions')

exports.handler = stream(async (event, responseStream) => {
  if (event.httpMethod === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders() })
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return jsonResponse(500, { error: 'Missing DEEPSEEK_API_KEY in Netlify environment variables' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  if (!Array.isArray(payload.messages)) {
    return jsonResponse(400, { error: 'messages must be an array' })
  }

  const upstreamPayload = {
    model: typeof payload.model === 'string' ? payload.model : 'deepseek-chat',
    temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.7,
    max_tokens: typeof payload.max_tokens === 'number' ? payload.max_tokens : 1200,
    stream: Boolean(payload.stream),
    messages: payload.messages,
  }

  const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: payload.stream ? 'text/event-stream' : 'application/json',
    },
    body: JSON.stringify(upstreamPayload),
  })

  if (!upstream.ok) {
    const text = await upstream.text()
    return jsonResponse(upstream.status, { error: parseUpstreamError(text, upstream.statusText), status: upstream.status })
  }

  if (!payload.stream) {
    const text = await upstream.text()
    responseStream.setStatusCode(upstream.status)
    responseStream.setContentType(upstream.headers.get('content-type') || 'application/json')
    responseStream.write(text)
    responseStream.end()
    return
  }

  responseStream.setStatusCode(upstream.status)
  responseStream.setContentType('text/event-stream; charset=utf-8')
  responseStream.setHeader('Cache-Control', 'no-cache, no-transform')
  responseStream.setHeader('Connection', 'keep-alive')

  const reader = upstream.body?.getReader()
  if (!reader) {
    responseStream.end()
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundaryIndex = buffer.indexOf('\n\n')
    while (boundaryIndex !== -1) {
      const block = buffer.slice(0, boundaryIndex).trim()
      buffer = buffer.slice(boundaryIndex + 2)
      if (block) responseStream.write(`data: ${block}\n\n`)
      boundaryIndex = buffer.indexOf('\n\n')
    }
  }

  const trailing = buffer.trim()
  if (trailing) responseStream.write(`data: ${trailing}\n\n`)
  responseStream.write('data: [DONE]\n\n')
  responseStream.end()
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
  })
}

function parseUpstreamError(text, fallback) {
  try {
    const body = JSON.parse(text)
    if (typeof body?.error === 'string') return body.error
    if (typeof body?.error?.message === 'string') return body.error.message
    if (typeof body?.message === 'string') return body.message
  } catch {}
  return fallback
}
