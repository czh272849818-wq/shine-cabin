import { useState } from 'react'
import { ArrowRight, Compass, DollarSign, PenTool, Repeat, Send } from 'lucide-react'
import clsx from 'clsx'
import { chatCompletionStream } from '@/services/llm'
import { useWorkspace } from '@/hooks/useWorkspace'

const modules = [
  { title: '选题池', desc: '找内容方向', icon: Compass },
  { title: '脚本室', desc: '写镜头和口播', icon: PenTool },
  { title: '复盘台', desc: '看数据找问题', icon: Repeat },
  { title: '变现台', desc: '接住线索成交', icon: DollarSign },
]

function Dashboard() {
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState('')
  const { workspace, loading: workspaceLoading, error: workspaceError } = useWorkspace()
  const leads = workspace?.leads ?? []
  const data = workspace?.metrics
  const conversionRate = leads.length > 0 && data ? (data.deals / leads.length) * 100 : 0
  const metrics = [
    { label: '本月线索', value: `${leads.length}` },
    { label: 'A级线索', value: `${leads.filter((lead) => lead.level === 'A').length}` },
    { label: '转化率', value: `${conversionRate.toFixed(1)}%` },
    { label: '完播率', value: `${(data?.completionRate ?? 0).toFixed(1)}%` },
  ]
  const priorities = [
    leads.length === 0 ? '先录入第一批真实线索，建立可跟进事实' : '优先跟进A级线索，确认下一步动作',
    data?.completionRate ? '根据完播率筛选高潜内容，复刻结构' : '录入内容数据，找到真实内容约束',
    data?.deals ? '复盘成交路径，沉淀成跟进模板' : '设置本周成交目标，开始记录成交数',
  ]

  const generatePlan = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setPlan('')
    try {
      await chatCompletionStream(
        [
          {
            role: 'system',
            content: '你是自媒体工作台教练。用第一性原理判断今天最该做什么，只给能执行的动作。',
          },
          {
            role: 'user',
            content: `
真实业务数据：
- 线索数：${leads.length}
- A级线索：${leads.filter((lead) => lead.level === 'A').length}
- 成交数：${data?.deals ?? 0}
- 播放：${data?.plays ?? 0}
- 粉丝：${data?.followers ?? 0}
- 互动率：${data?.engagementRate ?? 0}%
- 完播率：${data?.completionRate ?? 0}%
- 内容信号：${(workspace?.contents ?? []).map((item) => `${item.title}/${item.signal}/${item.completionRate}%`).join('；') || '暂无'}

补充信息：${context.trim() || '暂无补充。'}

请输出：
1. 一句话本质判断
2. 今天最重要的3件事
3. 每件事的产出物
4. 对应的内容脚本或私信话术
5. 明天用什么数据判断有效
`.trim(),
          },
        ],
        {
          temperature: 0.5,
          onDelta: setPlan,
        }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">势能舱</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-gray-950">
              用AI把选题、脚本、发布、复盘和变现压缩成一个工作流。
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
              目标不是多发内容，而是持续产出可拍、可发、可复盘、可变现的内容动作。
            </p>
          </div>
          <button
            type="button"
            onClick={generatePlan}
            disabled={loading}
            className={clsx('flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold', loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white')}
          >
            <Send className="h-4 w-4" />
            {loading ? '生成中' : '生成今日动作'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {workspaceLoading ? <div className="col-span-full rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-500">正在读取云端数据...</div> : null}
        {workspaceError ? <div className="col-span-full rounded-lg border border-red-100 bg-red-50 p-5 text-sm text-red-700">{workspaceError}</div> : null}
        {metrics.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-950">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-bold text-gray-950">今日输入</h2>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="输入行业、产品、客单价、当前账号数据、线索来源、成交方式、最想解决的问题。"
            className="mt-4 h-40 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error ? <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {plan ? (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm leading-7 text-gray-800 whitespace-pre-wrap">{plan}</div>
          ) : null}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-bold text-gray-950">今日优先级</h2>
          <div className="mt-4 space-y-3">
            {priorities.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg bg-gray-50 p-4">
                <span className="text-sm font-bold text-primary">0{index + 1}</span>
                <p className="text-sm font-medium text-gray-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-bold text-gray-950">内容工作流</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          {modules.map((item) => (
            <div key={item.title} className="rounded-lg border border-gray-100 p-4">
              <item.icon className="h-5 w-5 text-primary" />
              <p className="mt-4 font-semibold text-gray-950">{item.title}</p>
              <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">产品说明</h2>
            <p className="mt-1 text-sm text-gray-500">面向自媒体工作者的云端工作台，数据与 AI 都走 Netlify。</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {['邮箱注册登录', '选题到变现闭环', '云端工作区数据'].map((item) => (
            <div key={item} className="rounded-lg bg-gray-50 p-4 text-sm font-semibold text-gray-700">
              {item}
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

export default Dashboard
