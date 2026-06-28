import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  Home,
  BarChart3,
  Target,
  FileVideo,
  Users,
  TrendingUp,
  Sparkles,
  X,
  Send,
  Orbit,
} from 'lucide-react'
import clsx from 'clsx'
import { chatCompletionStream, type LlmMessage } from '@/services/llm'
import { clearSession, getSession } from '@/services/workspace'
import { useWorkspace } from '@/hooks/useWorkspace'

const navigation = [
  { name: '工作台', href: '/', icon: Home },
  { name: '行业分析', href: '/analysis', icon: BarChart3 },
  { name: 'IP定位', href: '/positioning', icon: Target },
  { name: '内容工厂', href: '/content', icon: FileVideo },
  { name: '客户中心', href: '/customers', icon: Users },
  { name: '数据洞察', href: '/insights', icon: TrendingUp },
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
  const [assistantHealth, setAssistantHealth] = useState<{
    hasKey: boolean
    hasProcessEnvKey?: boolean
    source?: 'processEnv' | 'envFile' | 'runtime' | 'netlifyEnv' | null
  } | null>(null)
  const [assistantKeyDraft, setAssistantKeyDraft] = useState('')
  const [assistantKeySaving, setAssistantKeySaving] = useState(false)
  const [assistantKeyError, setAssistantKeyError] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<LlmMessage[]>([])

  const moduleMeta = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/analysis')) {
      return {
        title: '行业分析',
        system: `你是“势能舱”平台的行业分析专家。目标：帮助用户快速完成行业机会、竞品、用户痛点、内容切入点的分析，并给出可执行的内容与转化建议。输出要求：结构化分点、可直接落地。`,
      }
    }
    if (path.startsWith('/positioning')) {
      return {
        title: 'IP定位',
        system: `你是“势能舱”平台的IP定位与人设策略专家。目标：基于用户行业与资源，给出强人设、强反差、强真实的定位方案，并输出账号定位、标签、三句自我介绍、选题方向与避坑清单。`,
      }
    }
    if (path.startsWith('/content')) {
      return {
        title: '内容工厂',
        system: `你是“势能舱”平台的内容导演与短视频编导。严格使用三大公式：1) 强人设+强反差+强真实=稳定涨粉；2) 痛点提问+行业揭秘+情绪共鸣=搞定完播；3) 固定挑战+随机结果+真实反应=爆款流量。输出要包含：开头3秒钩子、脚本结构、镜头/画面建议、口播文案、标题与封面文案。`,
      }
    }
    if (path.startsWith('/customers')) {
      return {
        title: '客户中心',
        system: `你是“势能舱”平台的线索运营与转化顾问。目标：把内容带来的线索做分层、跟进、事实跟踪与成交推进。输出要包含：线索分级规则、跟进话术、关键事实字段、下一步动作与风险预警。`,
      }
    }
    if (path.startsWith('/insights')) {
      return {
        title: '数据洞察',
        system: `你是“势能舱”平台的数据分析师。目标：从数据看问题，给出可执行的内容与转化优化策略。输出要包含：核心指标诊断、可能原因、验证方法、优先级建议与具体动作。`,
      }
    }
    return {
      title: '工作台',
      system: `你是“势能舱”平台的全流程教练。目标：帮助用户按行业分析→IP定位→内容制作→流量承接→线索管理→数据复盘→变现的流程推进。输出要包含：下一步最关键的3件事与今天就能执行的清单。`,
    }
  }, [location.pathname])

  const systemMessage = useMemo<LlmMessage>(
    () => ({ role: 'system', content: moduleMeta.system }),
    [moduleMeta.system]
  )

  useEffect(() => {
    setAssistantDraft('')
    setAssistantError('')
    setAssistantMessages([])
    setAssistantLoading(false)
  }, [systemMessage.content])

  useEffect(() => {
    if (!assistantOpen) return
    fetch('/api/llm/health')
      .then((r) => r.json())
      .then((j) =>
        setAssistantHealth({
          hasKey: Boolean(j?.hasKey),
          hasProcessEnvKey: typeof j?.hasProcessEnvKey === 'boolean' ? j.hasProcessEnvKey : undefined,
          source: (j?.source ?? null) as any,
        })
      )
      .catch(() => setAssistantHealth(null))
  }, [assistantOpen])

  const refreshHealth = async () => {
    try {
      const r = await fetch('/api/llm/health')
      const j = await r.json()
      setAssistantHealth({
        hasKey: Boolean(j?.hasKey),
        hasProcessEnvKey: typeof j?.hasProcessEnvKey === 'boolean' ? j.hasProcessEnvKey : undefined,
        source: (j?.source ?? null) as any,
      })
    } catch {
      setAssistantHealth(null)
    }
  }

  const saveRuntimeKey = async () => {
    if (assistantKeySaving) return
    if (!assistantKeyDraft.trim()) {
      setAssistantKeyError('请先输入 Key')
      return
    }
    setAssistantKeySaving(true)
    setAssistantKeyError('')
    try {
      const r = await fetch('/api/llm/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: assistantKeyDraft.trim() }),
      })
      if (!r.ok) {
        const j = (await r.json()) as any
        throw new Error(typeof j?.error === 'string' ? j.error : '保存失败')
      }
      setAssistantKeyDraft('')
      await refreshHealth()
    } catch (e) {
      setAssistantKeyError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setAssistantKeySaving(false)
    }
  }

  const clearRuntimeKey = async () => {
    try {
      await fetch('/api/llm/key', { method: 'DELETE' })
    } finally {
      await refreshHealth()
    }
  }

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
  const conversionRate = leadCount > 0 && workspace ? ((workspace.metrics.deals / leadCount) * 100).toFixed(1) : '0.0'

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center">
                <Orbit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">势能舱</h1>
                <p className="text-xs text-gray-500 mt-1">AI IP增长作战台</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="bg-[#F4F7F6] rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  V
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{session?.user.name || '增长负责人'}</p>
                  <p className="text-xs text-gray-500">{session?.user.method === 'phone' ? '手机号账号' : '邮箱账号'}</p>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                <p>线索: <span className="font-bold text-primary">{leadCount}</span></p>
                <p>转化率: <span className="font-bold text-accent-orange">{conversionRate}%</span></p>
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

      <main className="ml-64 min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        {!assistantOpen ? (
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-white shadow-lg transition-shadow"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">AI助手</span>
          </button>
        ) : (
          <div className="w-[380px] h-[520px] bg-white border border-gray-200 shadow-2xl rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#F4F7F6]">
              <div>
                <p className="text-sm font-semibold text-gray-900">势能舱AI · {moduleMeta.title}</p>
                <p className="text-xs text-gray-500">
                  {assistantHealth?.hasKey === false
                    ? '未检测到 Key（可在此窗口临时配置，避免写入前端代码）'
                    : assistantHealth?.hasKey === true
                      ? 'DeepSeek 已就绪（走本地安全代理）'
                      : 'DeepSeek 本地安全代理'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {assistantHealth?.hasKey === true ? (
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">已连接</p>
                      <p className="text-xs text-gray-600">
                        来源：
                        {assistantHealth.source === 'processEnv'
                          ? '环境变量（process.env）'
                          : assistantHealth.source === 'envFile'
                            ? '环境文件（.env*）'
                            : assistantHealth.source === 'runtime'
                              ? '临时配置（运行时内存）'
                              : assistantHealth.source === 'netlifyEnv'
                                ? 'Netlify环境变量'
                              : '未知'}
                      </p>
                    </div>
                    {assistantHealth.source === 'runtime' ? (
                      <button
                        type="button"
                        onClick={clearRuntimeKey}
                        className="h-9 px-3 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      >
                        清除临时Key
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {assistantHealth?.hasKey === false ? (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50">
                  <p className="text-sm font-semibold text-amber-900 mb-2">临时配置 DeepSeek Key</p>
                  <p className="text-xs text-amber-800 mb-3">
                    Key 仅保存在本地开发服务器内存中，重启 dev server 后需要重新配置。
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={assistantKeyDraft}
                      onChange={(e) => setAssistantKeyDraft(e.target.value)}
                      placeholder="在此粘贴 Key（不会写入代码）"
                      className="flex-1 h-10 rounded-xl border border-amber-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <button
                      type="button"
                      onClick={saveRuntimeKey}
                      disabled={assistantKeySaving || !assistantKeyDraft.trim()}
                      className={clsx(
                        'h-10 px-4 rounded-xl text-sm font-medium transition-colors',
                        assistantKeySaving || !assistantKeyDraft.trim()
                          ? 'bg-amber-100 text-amber-400'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      )}
                    >
                      {assistantKeySaving ? '保存中…' : '保存'}
                    </button>
                  </div>
                  {assistantKeyError ? (
                    <div className="mt-3 text-xs text-red-700">{assistantKeyError}</div>
                  ) : null}
                </div>
              ) : null}

              {assistantMessages.length === 0 ? (
                <div className="text-sm text-gray-600 leading-relaxed">
                  <p className="font-semibold text-gray-800 mb-2">给我这些信息，我会直接输出可执行方案：</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>行业/产品/客单价/目标客户</li>
                    <li>你要做的IP角色（老板/专家/销售/运营）</li>
                    <li>你现在的账号基础（粉丝/内容/成交方式）</li>
                  </ul>
                </div>
              ) : null}

              {assistantMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-gray-900 text-white ml-8'
                      : 'bg-gray-50 text-gray-800 mr-8 border border-gray-100'
                  )}
                >
                  {m.content}
                </div>
              ))}

              {assistantLoading ? (
                <div className="rounded-2xl px-4 py-3 text-sm bg-gray-50 text-gray-600 mr-8 border border-gray-100">
                  正在生成…
                </div>
              ) : null}

              {assistantError ? (
                <div className="rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-100">
                  {assistantError}
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex items-end gap-2">
                <textarea
                  value={assistantDraft}
                  onChange={(e) => setAssistantDraft(e.target.value)}
                  placeholder="输入你的问题/需求（Enter换行，点击发送）"
                  className="flex-1 min-h-[44px] max-h-28 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={sendAssistant}
                  disabled={assistantLoading || !assistantDraft.trim()}
                  className={clsx(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                    assistantLoading || !assistantDraft.trim()
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gradient-to-r from-primary to-accent-purple text-white hover:opacity-95'
                  )}
                  aria-label="发送"
                >
                  <Send className="w-5 h-5" />
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
