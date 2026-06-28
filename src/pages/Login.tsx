import { useState } from 'react'
import { Eye, EyeOff, Mail, Orbit, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { authenticate, saveSession } from '@/services/workspace'

function Login() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!email.trim()) {
      setNotice('请输入邮箱')
      return
    }
    if (password.length < 6) {
      setNotice('请输入至少 6 位密码')
      return
    }

    setLoading(true)
    setNotice('')
    try {
      const session = await authenticate({
        mode: authMode,
        method: 'email',
        identifier: email.trim(),
        password,
        name,
      })
      saveSession(session)
      navigate('/')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between px-6 py-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
              <Orbit className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-950">势能舱</p>
              <p className="text-xs text-gray-500">自媒体工作台</p>
            </div>
          </div>

          <div className="my-14">
            <p className="text-sm font-semibold text-primary">邮箱入口</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-gray-950">
              面向自媒体工作者的创作、发布、复盘与变现工具。
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-gray-600">
              当前版本只保留邮箱登录注册，减少入口干扰，让用户直接进入工作流。
            </p>
          </div>

          <div className="grid gap-3 text-sm text-gray-600">
            {['邮箱账号进入云端工作区', '适合单人创作者与小团队', '从选题到变现都在同一套流程里'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
              {(['login', 'register'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAuthMode(item)}
                  className={clsx(
                    'rounded-md py-2 text-sm font-semibold',
                    authMode === item ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'
                  )}
                >
                  {item === 'login' ? '登录' : '注册'}
                </button>
              ))}
            </div>

            <div className="mb-5 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-950">邮箱{authMode === 'login' ? '登录' : '注册'}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">完成后直接进入自媒体工作流。</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' ? (
                <div>
                  <label className="text-sm font-semibold text-gray-700">姓名</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="请输入姓名"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ) : null}

              <div>
                <label className="text-sm font-semibold text-gray-700">邮箱</label>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-4 focus-within:ring-2 focus-within:ring-primary/20">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    inputMode="email"
                    className="h-11 w-full text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">密码</label>
                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={authMode === 'login' ? '请输入密码' : '设置登录密码'}
                    className="h-11 w-full rounded-lg border border-gray-200 px-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label="切换密码显示"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {notice ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{notice}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className={clsx('h-11 w-full rounded-lg text-sm font-semibold text-white', loading ? 'bg-gray-300' : 'bg-primary hover:bg-primary-light')}
              >
                {loading ? '处理中' : authMode === 'login' ? '进入工作台' : '创建账号'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Login
