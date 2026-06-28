import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  Home,
  Compass,
  PenTool,
  Send,
  Repeat,
  DollarSign,
  Sparkles,
  X,
  Orbit,
} from 'lucide-react'
import clsx from 'clsx'
import { chatCompletionStream, type LlmMessage } from '@/services/llm'
import { clearSession, getSession } from '@/services/workspace'
import { useWorkspace } from '@/hooks/useWorkspace'

const navigation = [
  { name: '工作台', href: '/', icon: Home },
  { name: '选题池', href: '/analysis', icon: Compass },
  { name: '脚本室', href: '/positioning', icon: PenTool },
  { name: '发布台', href: '/content', icon: Send },
  { name: '复盘台', href: '/insights', icon: Repeat },
  { name: '变现台', href: '/customers', icon: DollarSign },
]

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const { workspace } = useWorkspace()
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantDraft, setAssistantDraft] = useState('')
  const [assistantError, setAssistantError] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState<LlmMessage[]>([])

  const moduleMeta = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/analysis')) {
      return {
        title: '选题池',
        system: '你是自媒体选题教练。只给选题、标题、角度和选题池，不要讲行业大道理。',
      }
    }
    if (path.startsWith('/positioning')) {
      return {
        title: '脚本室',
        system: '你是自媒体脚本教练。只给账号定位、表达结构、开头钩子、镜头建议和口播，不要空话。',
      }
    }
    if (path.startsWith('/content')) {
      return {
        title: '发布台',
        system: '你是自媒体发布教练。输出标题、封面、标签、发布时间、评论区引导和发布检查清单。',
      }
    }
    if (path.startsWith('/insights')) {
      return {
        title: '复盘台',
        system: '你是自媒体复盘教练。用数据找问题，只输出可验证动作与下一步实验。',
      }
    }
    if (path.startsWith('/customers')) {
      return {
        title: '变现台',
        system: '你是自媒体变现教练。只输出私信、表单、成交和线索推进动作。',
      }
    }
    return {
      title: '工作台',
      system: '你是自媒体工作台教练。帮助用户按选题→脚本→发布→复盘→变现的流程推进。',
    }
  }, [location.pathname])

  const systemMessage = useMemo<LlmMessage>(() => ({ role: 'system', content: moduleMeta.system }), [moduleMeta.system])

  useEffect(() => {
    setAssistantDraft('')
    setAssistantError('')
    setAssistantMessages([])
    setAssistantLoading(false)
  }, [systemMessage.content])

  const sendAssistant = async () => {
    if (!assistantDraft.trim() || assistantLoading) return
    const next = [...assistantMessages, { role: 'user', content: assistantDraft.trim() } as LlmMessage]
    setAssistantMessages(next)
    setAssistantDraft('')
    setAssistantError('')
    setAssistantLoading(true)
    try {
      let assistantText = ''
      await chatCompletionStream([systemMessage, ...next], {
        onDelta: (text) => {
          assistantText = text
          setAssistantMessages([...next, { role: 'assistant', content: assistantText }])
        },
      })
      if (!assistantText) {
        setAssistantMessages([...next, { role: 'assistant', content: '' }])
      }
    } catch (e) {
      setAssistantError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setAssistantLoading(false)
    }
  }

  const logout = () => {
    clearSession()
    navigate('/login')
  }

  const leadCount = workspace?.leads.length ?? 0
  const completionRate = workspace?.metrics.completionRate ?? 0

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary">
                <Orbit className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">势能舱</h1>
                <p className="mt-1 text-xs text-gray-500">自媒体工作台</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200',
                    isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-gray-100 p-4">
            <div className="rounded-lg border border-gray-200 bg-[#F4F7F6] p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white">
                  V
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{session?.user.name || '创作者'}</p>
                  <p className="text-xs text-gray-500">邮箱账号</p>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                <p>线索: <span className="font-bold text-primary">{leadCount}</span></p>
                <p>完播率: <span className="font-bold text-accent-orange">{completionRate.toFixed(1)}%</span></p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="mt-3 h-9 w-full rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen p-8 pl-64">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        {!assistantOpen ? (
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-white shadow-lg transition-shadow"
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">AI助手</span>
          </button>
        ) : (
          <div className="flex h-[520px] w-[380px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-[#F4F7F6] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">势能舱AI · {moduleMeta.title}</p>
                <p className="text-xs text-gray-500">面向自媒体工作者的执行建议</p>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100"
                aria-label="关闭"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {assistantMessages.length === 0 ? (
                <div className="text-sm leading-relaxed text-gray-600">
                  <p className="mb-2 font-semibold text-gray-800">输入你的账号、选题或复盘问题，我会直接给可执行方案。</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>账号方向</li>
                    <li>选题和标题</li>
                    <li>脚本和镜头</li>
                    <li>复盘和变现动作</li>
                  </ul>
                </div>
              ) : null}

              {assistantMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm',
                    m.role === 'user' ? 'ml-8 bg-gray-900 text-white' : 'mr-8 border border-gray-100 bg-gray-50 text-gray-800'
                  )}
                >
                  {m.content}
                </div>
              ))}

              {assistantLoading ? (
                <div className="mr-8 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  正在生成…
                </div>
              ) : null}

              {assistantError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{assistantError}</div> : null}
            </div>

            <div className="border-t border-gray-100 p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={assistantDraft}
                  onChange={(e) => setAssistantDraft(e.target.value)}
                  placeholder="输入你的问题/需求（Enter换行，点击发送）"
                  className="min-h-[44px] max-h-28 flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={sendAssistant}
                  disabled={assistantLoading || !assistantDraft.trim()}
                  className={clsx(
                    'flex h-12 w-12 items-center justify-center rounded-2xl transition-colors',
                    assistantLoading || !assistantDraft.trim()
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gradient-to-r from-primary to-accent-purple text-white hover:opacity-95'
                  )}
                  aria-label="发送"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Layout
