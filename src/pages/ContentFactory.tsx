import { useState } from 'react'
import { FileText, Image as ImageIcon, Play, Sparkles, Video, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { chatCompletionStream } from '@/services/llm'
import { creatorPlatforms, emptyWorkspace, type ContentSignal, type CreatorPlatform } from '@/services/workspace'
import { useWorkspace } from '@/hooks/useWorkspace'

type Mode = 'video' | 'graphic'
type Goal = '涨粉' | '完播' | '转化'
type Platform = Exclude<CreatorPlatform, '其他'>

const contentMix = [
  { label: '人设', desc: '建立信任' },
  { label: '科普', desc: '解决问题' },
  { label: '故事', desc: '扩大传播' },
]

const platformOptions: Platform[] = creatorPlatforms.filter((item): item is Platform => item !== '其他')

function ContentFactory() {
  const [mode, setMode] = useState<Mode>('video')
  const [goal, setGoal] = useState<Goal>('转化')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(platformOptions)
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [notice, setNotice] = useState('')
  const { workspace, save, saving } = useWorkspace()
  const currentWorkspace = workspace ?? emptyWorkspace()

  const generate = async () => {
    if (!topic.trim()) {
      setError('请先输入一个具体主题')
      return
    }
    if (loading) return
    setLoading(true)
    setError('')
    setNotice('')
    setResult('')
    try {
      const platformList = selectedPlatforms.length > 0 ? selectedPlatforms.join('、') : '抖音、小红书、视频号、B站、公众号'
      await chatCompletionStream([
        { role: 'system', content: '你是全平台自媒体发布教练。输出必须能直接复制执行，避免空话；严格围绕用户给出的主题，不要引入无关案例，不要擅自替换主题。' },
        {
          role: 'user',
          content: `
内容形态：${mode === 'video' ? '短视频' : '图文'}
目标：${goal}
需要输出的平台：${platformList}
主题：${topic.trim()}
背景：${context.trim() || '本地服务型IP，需要通过内容获客并转化线索。'}

请输出：
1. 一条主内容稿
2. 适合各平台的标题10个
3. 开头钩子3个
4. 正文/口播脚本，按时间或段落拆分
5. 画面/配图规划
6. 评论区引导
7. 私信关键词和回复话术
8. 分别给出所选平台的改写建议
9. 发布后看哪3个指标判断是否有效
10. 不要擅自更换主题，不要使用无关的热点案例；如需示例，只能围绕当前主题展开
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

  const saveDraft = async () => {
    if (!result.trim() || saving) return
    const savePlatforms = selectedPlatforms.length > 0 ? selectedPlatforms : platformOptions
    const drafts: ContentSignal[] = savePlatforms.map((platform) => ({
      id: crypto.randomUUID(),
      platform,
      title: topic.trim() || '未命名主题',
      signal: `AI草稿 / ${mode === 'video' ? '短视频' : '图文'} / ${goal}`,
      completionRate: 0,
      createdAt: new Date().toISOString(),
    }))
    await save({ ...currentWorkspace, contents: [...drafts, ...currentWorkspace.contents] })
    setNotice(`已保存 ${drafts.length} 条平台草稿到内容库`)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">发布台</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">把选题变成可直接发布的内容包</h1>
          <p className="mt-2 text-sm text-gray-500">从脚本到标题、封面、评论区引导，统一输出同一条内容链，并适配多平台。</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={clsx('flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold', loading ? 'bg-gray-200 text-gray-500' : 'bg-primary text-white')}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '生成中' : '生成脚本'}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
            <span className="text-primary">平台</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {platformOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSelectedPlatforms((current) =>
                    current.includes(item) ? current.filter((platform) => platform !== item) : [...current, item]
                  )
                }}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-sm font-semibold',
                  selectedPlatforms.includes(item) ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-700'
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlatforms(platformOptions)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              全选
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatforms([])}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              清空
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            已选择平台：{selectedPlatforms.length > 0 ? selectedPlatforms.join('、') : '未选择，默认全平台'}
          </div>

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

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-950">下一步</h2>
            <p className="mt-1 text-sm text-gray-500">发布后把数据带到复盘台，确认下一轮要优化哪个平台和哪种表达。</p>
          </div>
          <Link to="/insights" className="flex items-center gap-2 text-sm font-semibold text-primary">
            去复盘台
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}
      {result ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-950">生成结果</h2>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{result}</div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className={clsx('rounded-lg px-4 py-2 text-sm font-semibold text-white', saving ? 'bg-gray-300' : 'bg-primary')}
            >
              {saving ? '保存中' : '保存到内容库'}
            </button>
            <Link to="/insights" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              去复盘台
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default ContentFactory
