import { chatCompletionStream } from '@/services/llm'

export type CreatorStage = 'idea' | 'script' | 'publish' | 'review' | 'monetize'

export const creatorStages: Array<{
  key: CreatorStage
  label: string
  title: string
  desc: string
}> = [
  { key: 'idea', label: '选题', title: '找对要拍什么', desc: '把热点、用户痛点和账号方向压成选题池。' },
  { key: 'script', label: '脚本', title: '把选题变成镜头', desc: '给出开头钩子、结构、镜头和口播。' },
  { key: 'publish', label: '发布', title: '安排发布时间与包装', desc: '统一标题、封面、标签、评论区引导。' },
  { key: 'review', label: '复盘', title: '找出真正有效的内容', desc: '看播放、完播、互动和转化。' },
  { key: 'monetize', label: '变现', title: '接住线索和成交', desc: '把流量导向咨询、私信、表单或成交页。' },
]

export async function streamCreatorAdvice(
  stage: CreatorStage,
  prompt: string,
  onDelta: (text: string) => void
) {
  const stageMeta = creatorStages.find((item) => item.key === stage)
  return chatCompletionStream(
    [
      {
        role: 'system',
        content:
          '你是自媒体工作台的增长教练。你只输出自媒体工作者真正需要的执行清单，拒绝空话。结果必须能直接拿去发、拍、剪、复盘。',
      },
      {
        role: 'user',
        content: `
当前阶段：${stageMeta?.title || stage}
阶段说明：${stageMeta?.desc || ''}
用户输入：${prompt.trim() || '暂无'}

请输出：
1. 一句话本质判断
2. 3个最重要动作
3. 具体产出物
4. 最容易踩坑的地方
5. 下一步怎么继续推进
`.trim(),
      },
    ],
    { temperature: 0.55, onDelta }
  )
}
