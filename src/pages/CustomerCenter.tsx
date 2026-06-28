import { useMemo, useState } from 'react'
import { ArrowRight, MessageSquare, Phone, Sparkles, Users } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { chatCompletionStream } from '@/services/llm'
import { useWorkspace } from '@/hooks/useWorkspace'
import { creatorPlatforms, emptyWorkspace, type CreatorPlatform, type Lead } from '@/services/workspace'

function CustomerCenter() {
  const [level, setLevel] = useState('全部')
  const [platformFilter, setPlatformFilter] = useState<'全部' | Exclude<CreatorPlatform, '其他'>>('全部')
  const [context, setContext] = useState('')
  const [form, setForm] = useState({
    name: '',
    source: '',
    platform: '抖音' as Exclude<CreatorPlatform, '其他'>,
    level: 'A' as Lead['level'],
    status: '待跟进',
    need: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [advice, setAdvice] = useState('')
  const { workspace, loading: workspaceLoading, saving, error: workspaceError, save } = useWorkspace()
  const currentWorkspace = workspace ?? emptyWorkspace()
  const leads = currentWorkspace.leads

  const visibleLeads = useMemo(
    () =>
      leads.filter((lead) => (level === '全部' || lead.level === level) && (platformFilter === '全部' || lead.platform === platformFilter)),
    [leads, level, platformFilter]
  )
  const conversionRate = leads.length > 0 ? ((currentWorkspace.metrics.deals / leads.length) * 100).toFixed(1) : '0.0'

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('请输入客户名称')
      return
    }
    const lead: Lead = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      source: form.source.trim() || '未记录',
      platform: form.platform,
      level: form.level,
      status: form.status.trim() || '待跟进',
      need: form.need.trim(),
      createdAt: new Date().toISOString(),
    }
    await save({ ...currentWorkspace, leads: [lead, ...currentWorkspace.leads] })
    setForm({ name: '', source: '', platform: '抖音', level: 'A', status: '待跟进', need: '' })
  }

  const generate = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setAdvice('')
    try {
      await chatCompletionStream(
        [
          { role: 'system', content: '你是势能舱成交转化顾问。输出必须是可复制话术和下一步动作。' },
          {
            role: 'user',
            content: `
当前线索等级：${level}
真实线索：
${visibleLeads.map((lead) => `- ${lead.name} / ${lead.source} / ${lead.platform} / ${lead.level}级 / ${lead.status} / ${lead.need || '未记录需求'}`).join('\n') || '暂无线索'}

补充背景：${context.trim() || '通过短视频和图文获得咨询，需要把线索推进到预约或成交。'}

请输出：
1. A/B/C线索判定标准
2. 首次私信回复3套
3. 电话回访脚本
4. 7天跟进节奏
5. 需要记录的10个事实字段
6. 最容易流失的风险点和处理话术
`.trim(),
          },
        ],
        {
          temperature: 0.55,
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
          <p className="text-sm font-semibold text-primary">变现台</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">把咨询变成可推进的成交动作</h1>
          <p className="mt-2 text-sm text-gray-500">这里不做泛泛的销售管理，只负责把线索推进到预约、咨询或成交。</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={clsx('flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold', loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white')}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '生成中' : '生成成交动作'}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: '总线索', value: `${leads.length}`, icon: Users },
          { label: 'A级线索', value: `${leads.filter((lead) => lead.level === 'A').length}`, icon: Phone },
          { label: '成交转化率', value: `${conversionRate}%`, icon: MessageSquare },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-5">
            <item.icon className="h-5 w-5 text-primary" />
            <p className="mt-4 text-sm text-gray-500">{item.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-950">{item.value}</p>
          </div>
        ))}
      </section>

      {workspaceLoading ? <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">正在读取云端线索...</div> : null}
      {workspaceError || error ? <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{workspaceError || error}</div> : null}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <form onSubmit={addLead} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="客户名称"
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="来源：视频号私信/微信/转介绍"
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value as Exclude<CreatorPlatform, '其他'> })}
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              {creatorPlatforms.filter((item): item is Exclude<CreatorPlatform, '其他'> => item !== '其他').map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value as Lead['level'] })}
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="A">A级</option>
              <option value="B">B级</option>
              <option value="C">C级</option>
            </select>
            <input
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              placeholder="状态"
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={form.need}
              onChange={(e) => setForm({ ...form, need: e.target.value })}
              placeholder="需求/异议"
              className="h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 md:col-span-2"
            />
            <button
              type="submit"
              disabled={saving}
              className={clsx('h-11 rounded-lg text-sm font-semibold text-white md:col-span-2', saving ? 'bg-gray-300' : 'bg-primary')}
            >
              {saving ? '保存中' : '添加线索'}
            </button>
          </form>

          <div className="mb-4 flex flex-wrap gap-2">
            {['全部', 'A', 'B', 'C'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLevel(item)}
                className={clsx('rounded-lg border px-4 py-2 text-sm font-semibold', level === item ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700')}
              >
                {item === '全部' ? '全部' : `${item}级`}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPlatformFilter('全部')}
              className={clsx('rounded-lg border px-4 py-2 text-sm font-semibold', platformFilter === '全部' ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700')}
            >
              全部平台
            </button>
            {(['抖音', '小红书', '视频号', 'B站', '公众号'] as Exclude<CreatorPlatform, '其他'>[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPlatformFilter(item)}
                className={clsx('rounded-lg border px-4 py-2 text-sm font-semibold', platformFilter === item ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700')}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="divide-y divide-gray-100">
            {visibleLeads.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">暂无线索。先添加真实客户，再让 AI 生成跟进策略。</div>
            ) : null}
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="py-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-950">{lead.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{lead.platform}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">{lead.level}级</span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">{lead.source} / {lead.status} / {lead.need}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <label className="text-sm font-semibold text-gray-950">跟进背景</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="补充：产品、客单价、常见异议、成交方式、你希望下一步推进到哪里。"
            className="mt-3 h-44 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-950">上一环</h2>
            <p className="mt-1 text-sm text-gray-500">如果线索不够，先回到发布台和复盘台，找出哪条内容带来更高质量咨询。</p>
          </div>
          <Link to="/content" className="flex items-center gap-2 text-sm font-semibold text-primary">
            去发布台
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {advice ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-950">跟进方案</h2>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{advice}</div>
        </section>
      ) : null}
    </div>
  )
}

export default CustomerCenter
