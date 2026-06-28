import { useState } from 'react'
import { ArrowRight, BarChart3, Search, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { chatCompletionStream } from '@/services/llm'

const industries = ['建筑工程', '教育培训', '医疗健康', '金融服务', '餐饮美食', '房地产']

function IndustryAnalysis() {
  const [industry, setIndustry] = useState('建筑工程')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState('')

  const generateReport = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setReport('')
    try {
      await chatCompletionStream(
        [
          {
            role: 'system',
            content: '你是势能舱的行业战略分析师。只输出对增长、获客和成交有用的信息，不要泛泛分析。',
          },
          {
            role: 'user',
            content: `
行业：${industry}
业务背景：${context.trim() || '本地服务型IP，通过内容获客并转化线索。'}

请输出：
1. 本质判断：这个行业做IP获客的真正机会是什么
2. 目标客户：谁最值得优先服务，为什么
3. 约束：当前最可能卡住增长的3个问题
4. 内容切入：10个可直接发布的选题
5. 成交设计：私信关键词、资料包、首轮跟进话术
6. 7天实验：每天1个核心动作、1个产出物、1个验证指标
`.trim(),
          },
        ],
        {
          temperature: 0.55,
          onDelta: setReport,
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
          <p className="text-sm font-semibold text-primary">行业分析</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">找到最值得打穿的市场切口</h1>
        </div>
        <button
          type="button"
          onClick={generateReport}
          disabled={loading}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold',
            loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white hover:bg-primary-light'
          )}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '分析中' : '生成分析'}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            <Search className="h-4 w-4 text-primary" />
            行业
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {industries.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setIndustry(item)}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-sm font-medium',
                  industry === item ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            输入业务背景后，AI 会根据你的真实产品、地区、客单价和客户类型生成行业机会、痛点与成交阻力。
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <label className="text-sm font-semibold text-gray-950">业务背景</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="输入产品、客单价、地区、客户是谁、当前账号基础、最想解决的问题。"
            className="mt-3 h-36 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4" />
            输出会围绕获客、信任和成交，不做无用行业科普。
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {report ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-950">AI分析报告</h2>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{report}</div>
        </section>
      ) : null}
    </div>
  )
}

export default IndustryAnalysis
