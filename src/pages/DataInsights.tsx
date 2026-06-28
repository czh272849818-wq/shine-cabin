import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { chatCompletionStream } from '@/services/llm'
import { useWorkspace } from '@/hooks/useWorkspace'
import { emptyWorkspace, type ContentSignal, type WorkspaceMetrics } from '@/services/workspace'

function DataInsights() {
  const [context, setContext] = useState('')
  const [metricForm, setMetricForm] = useState<WorkspaceMetrics>({
    plays: 0,
    followers: 0,
    engagementRate: 0,
    completionRate: 0,
    conversions: 0,
    deals: 0,
  })
  const [contentForm, setContentForm] = useState({ title: '', signal: '', completionRate: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [advice, setAdvice] = useState('')
  const { workspace, loading: workspaceLoading, saving, error: workspaceError, save } = useWorkspace()
  const currentWorkspace = workspace ?? emptyWorkspace()
  const metrics = currentWorkspace.metrics
  const topContent = currentWorkspace.contents
  const metricCards = [
    { label: '播放', value: formatNumber(metrics.plays), change: '用户录入', up: metrics.plays > 0 },
    { label: '粉丝', value: formatNumber(metrics.followers), change: '用户录入', up: metrics.followers > 0 },
    { label: '互动', value: `${metrics.engagementRate.toFixed(1)}%`, change: '用户录入', up: metrics.engagementRate > 0 },
    { label: '完播', value: `${metrics.completionRate.toFixed(1)}%`, change: '用户录入', up: metrics.completionRate > 0 },
  ]

  useEffect(() => {
    if (workspace) setMetricForm(workspace.metrics)
  }, [workspace])

  const saveMetrics = async (e: React.FormEvent) => {
    e.preventDefault()
    await save({ ...currentWorkspace, metrics: metricForm })
  }

  const addContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contentForm.title.trim()) {
      setError('请输入内容标题')
      return
    }
    const item: ContentSignal = {
      id: crypto.randomUUID(),
      title: contentForm.title.trim(),
      signal: contentForm.signal.trim() || '未记录信号',
      completionRate: Number(contentForm.completionRate) || 0,
      createdAt: new Date().toISOString(),
    }
    await save({ ...currentWorkspace, contents: [item, ...currentWorkspace.contents] })
    setContentForm({ title: '', signal: '', completionRate: 0 })
  }

  const generate = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setAdvice('')
    try {
      await chatCompletionStream(
        [
          { role: 'system', content: '你是势能舱数据增长顾问。用数据找约束，只输出可验证动作。' },
          {
            role: 'user',
            content: `
核心指标：
- 播放：${metrics.plays}
- 粉丝：${metrics.followers}
- 互动率：${metrics.engagementRate}%
- 完播率：${metrics.completionRate}%
- 线索数：${currentWorkspace.leads.length}
- 成交数：${metrics.deals}

TOP内容：
${topContent.map((item) => `- ${item.title} / ${item.signal} / 完播${item.completionRate}%`).join('\n') || '暂无内容数据'}

补充背景：${context.trim() || '目标是提升内容到线索的转化。'}

请输出：
1. 本周真正问题是什么
2. 最该优化的一个指标
3. 3个原因假设
4. 7天验证实验
5. 下一批内容选题
6. 私信和资料包转化优化
`.trim(),
          },
        ],
        {
          temperature: 0.45,
          onDelta: setAdvice,
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
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">复盘台</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">只看能改变动作的数据</h1>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={clsx('flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold', loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white')}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '诊断中' : '生成复盘'}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {metricCards.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{item.label}</p>
              {item.up ? <ArrowUp className="h-4 w-4 text-emerald-600" /> : <ArrowDown className="h-4 w-4 text-red-600" />}
            </div>
            <p className="mt-4 text-3xl font-bold text-gray-950">{item.value}</p>
            <p className={clsx('mt-1 text-sm font-semibold', item.up ? 'text-emerald-600' : 'text-red-600')}>{item.change}</p>
          </div>
        ))}
      </section>

      {workspaceLoading ? <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">正在读取云端数据...</div> : null}
      {workspaceError || error ? <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{workspaceError || error}</div> : null}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-950">
            <BarChart3 className="h-4 w-4 text-primary" />
            内容信号
          </div>
          <form onSubmit={addContent} className="mb-4 grid grid-cols-1 gap-3">
            <input
              value={contentForm.title}
              onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
              placeholder="内容标题"
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={contentForm.signal}
              onChange={(e) => setContentForm({ ...contentForm, signal: e.target.value })}
              placeholder="内容信号：收藏高/评论多/转化好"
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={contentForm.completionRate}
                onChange={(e) => setContentForm({ ...contentForm, completionRate: Number(e.target.value) })}
                placeholder="完播率"
                type="number"
                min="0"
                step="0.1"
                className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button type="submit" disabled={saving} className={clsx('h-11 rounded-lg px-4 text-sm font-semibold text-white', saving ? 'bg-gray-300' : 'bg-primary')}>
                添加
              </button>
            </div>
          </form>
          <div className="divide-y divide-gray-100">
            {topContent.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">暂无内容数据。录入真实内容表现后，再做诊断。</div>
            ) : null}
            {topContent.map((item) => (
              <div key={item.title} className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-gray-950">{item.title}</p>
                  <span className="text-sm font-bold text-primary">{item.completionRate.toFixed(1)}%</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{item.signal}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <form onSubmit={saveMetrics} className="mb-5 grid grid-cols-2 gap-3">
            {([
              ['plays', '播放'],
              ['followers', '粉丝'],
              ['engagementRate', '互动率%'],
              ['completionRate', '完播率%'],
              ['conversions', '线索数'],
              ['deals', '成交数'],
            ] as const).map(([key, label]) => (
              <label key={key} className="text-sm font-semibold text-gray-950">
                {label}
                <input
                  value={metricForm[key]}
                  onChange={(e) => setMetricForm({ ...metricForm, [key]: Number(e.target.value) })}
                  type="number"
                  min="0"
                  step="0.1"
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            ))}
            <button type="submit" disabled={saving} className={clsx('col-span-2 h-11 rounded-lg text-sm font-semibold text-white', saving ? 'bg-gray-300' : 'bg-primary')}>
              {saving ? '保存中' : '保存指标'}
            </button>
          </form>
          <label className="text-sm font-semibold text-gray-950">补充数据</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="输入本周发布数量、线索数、成交数、最想提升的指标。"
            className="mt-3 h-44 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      {advice ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-950">诊断结果</h2>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{advice}</div>
        </section>
      ) : null}
    </div>
  )
}

function formatNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return `${value}`
}

export default DataInsights
