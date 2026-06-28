import { useState } from 'react'
import { ArrowRight, BadgeCheck, Sparkles, Target } from 'lucide-react'
import clsx from 'clsx'
import { chatCompletionStream } from '@/services/llm'

const dimensions = [
  { label: '角色', value: '老板 / 专家 / 销售 / 运营' },
  { label: '反差', value: '专业但说人话' },
  { label: '证据', value: '案例、过程、数据、客户反馈' },
]

function IPPositioning() {
  const [industry, setIndustry] = useState('建筑工程')
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const generate = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      await chatCompletionStream(
        [
          { role: 'system', content: '你是势能舱的IP定位专家。定位必须能被用户记住、能生产内容、能带来成交。' },
          {
            role: 'user',
            content: `
行业：${industry}
关键词：${keywords.trim() || '本地服务、真实案例、专业可信、老板IP'}

请输出：
1. IP定位一句话，30字以内
2. 产品/个人命名候选10个
3. 三句自我介绍：抖音、小红书、视频号
4. 人设支柱：专业、真实、利他各3条证据
5. 选题方向：人设、科普、案例、转化各5条
6. 不能做的事：6条避坑清单
`.trim(),
          },
        ],
        {
          temperature: 0.65,
          onDelta: setResult,
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
          <p className="text-sm font-semibold text-primary">IP定位</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">让用户一句话记住你</h1>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={clsx('flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold', loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white')}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '生成中' : '生成定位'}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <label className="text-sm font-semibold text-gray-950">行业</label>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-3 h-11 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <label className="mt-5 block text-sm font-semibold text-gray-950">关键词</label>
          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="输入你的资源、经历、客户、产品、性格、差异点。"
            className="mt-3 h-36 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            <Target className="h-4 w-4 text-primary" />
            定位模型
          </div>
          <div className="mt-4 space-y-3">
            {dimensions.map((item) => (
              <div key={item.label} className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  <p className="font-semibold text-gray-950">{item.label}</p>
                </div>
                <p className="mt-2 text-sm text-gray-600">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {result ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-950">定位方案</h2>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{result}</div>
        </section>
      ) : null}
    </div>
  )
}

export default IPPositioning
