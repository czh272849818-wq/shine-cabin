import { useState } from 'react'
import { ArrowRight, Compass, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { creatorStages, streamCreatorAdvice } from '@/services/creator'

function IndustryAnalysis() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState('')

  const generateReport = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setReport('')
    try {
      await streamCreatorAdvice(
        'idea',
        `
账号定位：${topic.trim() || '自媒体工作者'}

请围绕“选题”给出一个 7 天选题飞轮：
1. 用户最需要拍的内容是什么
2. 什么内容最容易拿到播放、完播、互动
3. 如何建立稳定选题池
4. 明天就能拍的 10 个选题
5. 每类选题的标题公式
`.trim(),
        setReport
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
          <p className="text-sm font-semibold text-primary">选题引擎</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">先找题，再开拍</h1>
        </div>
        <button
          type="button"
          onClick={generateReport}
          disabled={loading}
          className={clsx('flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold', loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white')}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '生成中' : '生成选题池'}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            <Compass className="h-4 w-4 text-primary" />
            账号信息
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="输入账号领域、受众、变现方式、发布平台。"
            className="mt-4 h-40 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            这个模块不再做行业宏观分析，只回答自媒体工作者最先要解决的选题问题。
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            <span className="text-primary">流程</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {creatorStages.map((item) => (
              <div key={item.key} className="rounded-lg border border-gray-100 p-4">
                <p className="text-xs font-semibold text-primary">{item.label}</p>
                <p className="mt-3 font-semibold text-gray-950">{item.title}</p>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {report ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-950">选题报告</h2>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{report}</div>
        </section>
      ) : null}
    </div>
  )
}

export default IndustryAnalysis
