export type LlmRole = 'system' | 'user' | 'assistant'

export type LlmMessage = {
  role: LlmRole
  content: string
}

export type ChatCompletionOptions = {
  model?: string
  temperature?: number
  max_tokens?: number
}

export type ChatCompletionStreamOptions = ChatCompletionOptions & {
  onDelta?: (text: string) => void
}

export async function chatCompletion(
  messages: LlmMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const res = await fetch('/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model ?? 'deepseek-chat',
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1200,
      messages,
    }),
  })

  const json = (await res.json().catch(() => null)) as any
  if (!res.ok) {
    const msg =
      typeof json?.error === 'string'
        ? json.error
        : typeof json?.error?.message === 'string'
          ? json.error.message
          : typeof json?.message === 'string'
            ? json.message
            : res.statusText
    throw new Error(msg)
  }

  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') return ''
  return content
}

export async function chatCompletionStream(
  messages: LlmMessage[],
  options: ChatCompletionStreamOptions = {}
): Promise<string> {
  const res = await fetch('/api/llm/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model ?? 'deepseek-chat',
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1200,
      stream: true,
      messages,
    }),
  })

  const contentType = res.headers.get('content-type') || ''
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as any
    const msg =
      typeof json?.error === 'string'
        ? json.error
        : typeof json?.error?.message === 'string'
          ? json.error.message
          : typeof json?.message === 'string'
            ? json.message
            : res.statusText
    throw new Error(msg)
  }

  if (!res.body || !contentType.includes('text/event-stream')) {
    const json = (await res.json().catch(() => null)) as any
    const content = json?.choices?.[0]?.message?.content
    if (typeof content === 'string') {
      options.onDelta?.(content)
      return content
    }
    return ''
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let boundaryIndex = buffer.indexOf('\n\n')
    while (boundaryIndex !== -1) {
      const rawEvent = buffer.slice(0, boundaryIndex).trim()
      buffer = buffer.slice(boundaryIndex + 2)
      handleSseEvent(rawEvent, (chunk) => {
        fullText += chunk
        options.onDelta?.(fullText)
      })
      boundaryIndex = buffer.indexOf('\n\n')
    }
  }

  const trailing = buffer.trim()
  if (trailing) {
    handleSseEvent(trailing, (chunk) => {
      fullText += chunk
      options.onDelta?.(fullText)
    })
  }

  return fullText
}

function handleSseEvent(eventBlock: string, onChunk: (chunk: string) => void) {
  if (!eventBlock) return
  const lines = eventBlock.split(/\r?\n/)
  for (const line of lines) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') continue
    try {
      const json = JSON.parse(data) as any
      const delta = json?.choices?.[0]?.delta
      const chunk =
        (typeof delta?.content === 'string' && delta.content) ||
        (typeof delta?.reasoning_content === 'string' && delta.reasoning_content) ||
        ''
      if (chunk) onChunk(chunk)
    } catch {
      continue
    }
  }
}
