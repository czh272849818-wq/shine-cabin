import { useState } from 'react'
import { FileText, Image as ImageIcon, Play, Sparkles, Video } from 'lucide-react'
import clsx from 'clsx'
import { chatCompletionStream } from '@/services/llm'

type Mode = 'video' | 'graphic'
type Goal = '涨粉' | '完播' | '转化'

const contentMix = [
  { label: '人设', desc: '建立信任' },
  { label: '科普', desc: '解决问题' },
  { label: '故事', desc: '扩大传播' },
]

function ContentFactory() {
  const [mode, setMode] = useState<Mode>('video')
  const [goal, setGoal] = useState<Goal>('转化')
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const generate = async () => {
    if (!topic.trim()) {
      setError('请先输入一个具体主题')
      return
    }
    if (loading) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      await chatCompletionStream([
        { role: 'system', content: '你是势能舱内容总监。输出必须能直接复制执行，避免空话。' },
        {
          role: 'user',
          content: `
内容形态：${mode === 'video' ? '短视频' : '图文'}
目标：${goal}
主题：${topic.trim()}
背景：${context.trim() || '本地服务型IP，需要通过内容获客并转化线索。'}

请输出：
1. 标题10个
2. 开头钩子3个
3. 正文/口播脚本，按时间或段落拆分
4. 画面/配图规划
5. 评论区引导
6. 私信关键词和回复话术
7. 发布后看哪3个指标判断是否有效
`.trim(),
        },
      ], {
        onDelta: setResult,
      })
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
          <p className="text-sm font-semibold text-primary">内容工厂</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">把一个问题变成一条可发布内容</h1>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={clsx('flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold', loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white')}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '生成中' : '生成内容'}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex gap-2">
            {(['video', 'graphic'] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={clsx(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold',
                  mode === item ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                )}
              >
                {item === 'video' ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                {item === 'video' ? '短视频' : '图文'}
              </button>
            ))}
          </div>

          <label className="mt-5 block text-sm font-semibold text-gray-950">主题</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="输入一个具体问题，例如：老楼加装电梯最容易踩的3个坑。"
            className="mt-3 h-28 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />

          <label className="mt-5 block text-sm font-semibold text-gray-950">背景</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="补充产品、客户、场景、案例、价格、想要引导的动作。"
            className="mt-3 h-24 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            <Play className="h-4 w-4 text-primary" />
            目标
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['涨粉', '完播', '转化'] as Goal[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGoal(item)}
                className={clsx('rounded-lg border px-3 py-2 text-sm font-semibold', goal === item ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700')}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {contentMix.map((item) => (
              <div key={item.label} className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-950">{item.label}</span>
                  <span className="text-sm font-bold text-primary">由AI判断</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {result ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-950">生成结果</h2>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{result}</div>
        </section>
      ) : null}
    </div>
  )
}

export default ContentFactory
