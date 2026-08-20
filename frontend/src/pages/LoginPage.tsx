import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Shield, User, LogIn, UserPlus, SendHorizonal, Smartphone, KeyRound, ChevronLeft } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgot, setIsForgot] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [codeTimer, setCodeTimer] = useState(0)
  const [resetDone, setResetDone] = useState(false)
  const [error, setError] = useState('')

  const { login, register: registerUser } = useAuth()
  const navigate = useNavigate()

  const [forgotPhone, setForgotPhone] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotNewPwd, setForgotNewPwd] = useState('')
  const [forgotShowPwd, setForgotShowPwd] = useState(false)
  const [forgotCodeTimer, setForgotCodeTimer] = useState(0)
  const [forgotCodeSent, setForgotCodeSent] = useState(false)
  const [forgotCodeLoading, setForgotCodeLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  // 发送验证码
  // 重置密码 - 发送验证码
  const handleForgotSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(forgotPhone)) {
      setError('请输入有效的手机号')
      return
    }
    setForgotCodeLoading(true)
    setError('')
    try {
      const { sendSmsCode } = await import('../api/auth')
      await sendSmsCode(forgotPhone)
      setForgotCodeSent(true)
      setForgotCodeTimer(60)
      const timer = setInterval(() => {
        setForgotCodeTimer(t => {
          if (t <= 1) { clearInterval(timer); return 0 }
          return t - 1
        })
      }, 1000)
    } catch (e: any) {
      setError(e?.response?.data?.detail || '发送验证码失败')
    } finally {
      setForgotCodeLoading(false)
    }
  }

  // 重置密码 - 提交
  const handleResetPwd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!forgotPhone) { setError('请输入手机号'); return }
    if (!forgotCode) { setError('请输入验证码'); return }
    if (!forgotNewPwd || forgotNewPwd.length < 6) { setError('密码至少6位'); return }
    setForgotLoading(true)
    try {
      const { default: api } = await import('../api/client')
      await api.post('/api/auth/reset-password', {
        phone: forgotPhone,
        code: forgotCode,
        new_password: forgotNewPwd,
      })
      setResetDone(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || '重置密码失败')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone) && phone !== 'adminboss') {
      setError('请输入有效的手机号')
      return
    }
    setCodeLoading(true)
    setError('')
    try {
      const { sendSmsCode } = await import('../api/auth')
      await sendSmsCode(phone)
      setCodeSent(true)
      setCodeTimer(60)
      const timer = setInterval(() => {
        setCodeTimer(t => {
          if (t <= 1) {
            clearInterval(timer)
            return 0
          }
          return t - 1
        })
      }, 1000)
      setError('') // 清空错误，提示在按钮上
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : '发送验证码失败')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phone) {
      setError('请输入手机号')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    if (!isLogin && !code) {
      setError('请输入验证码')
      return
    }

    setLoading(true)
    let ok: boolean
    if (isLogin) {
      ok = await login(phone, password)
    } else {
      ok = await registerUser(phone, password, code)
    }
    setLoading(false)

    if (ok) {
      navigate('/')
    } else {
      setError(isLogin ? '手机号或密码错误' : '注册失败，请重试')
    }
  }

  // Pre-computed JSX for card content to avoid Babel adjacent-element issues
  const formArea = isForgot ? (
    <form onSubmit={handleResetPwd} className="space-y-4">
      {resetDone ? (
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-emerald-400/15 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-brand-text">密码重置成功</h3>
          <p className="text-sm text-brand-text-dim">请使用新密码登录</p>
          <button type="button" onClick={() => { setIsForgot(false); setIsLogin(true); setResetDone(false); setForgotPhone(''); setForgotCode(''); setForgotNewPwd('') }} className="px-6 py-2.5 bg-brand-orange text-white rounded-lg hover:bg-brand-orange-light transition-colors font-medium">返回登录</button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => { setIsForgot(false); setError('') }} className="text-brand-text-dim hover:text-brand-text transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-brand-text">找回密码</h3>
          </div>
          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">手机号</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
              <input type="tel" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)} placeholder="请输入手机号" maxLength={11} className="w-full pl-10 pr-4 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:border-brand-blue transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">短信验证码</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
                <input type="text" value={forgotCode} onChange={e => setForgotCode(e.target.value)} placeholder="输入验证码" maxLength={6} className="w-full pl-10 pr-4 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:border-brand-blue transition-colors" />
              </div>
              <button type="button" onClick={handleForgotSendCode} disabled={forgotCodeLoading || forgotCodeTimer > 0 || !forgotPhone} className="shrink-0 px-4 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text-dim hover:text-brand-blue hover:border-brand-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {forgotCodeLoading ? '发送中...' : forgotCodeTimer > 0 ? `${forgotCodeTimer}s` : forgotCodeSent ? '重新发送' : '获取验证码'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-brand-text-muted mb-1.5">新密码</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
              <input type={forgotShowPwd ? 'text' : 'password'} value={forgotNewPwd} onChange={e => setForgotNewPwd(e.target.value)} placeholder="至少6位新密码" className="w-full pl-10 pr-12 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:border-brand-blue transition-colors" />
              <button type="button" onClick={() => setForgotShowPwd(!forgotShowPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-dim hover:text-brand-text transition-colors">
                {forgotShowPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="px-4 py-2.5 bg-red-400/10 border border-red-400/30 rounded-lg text-sm text-red-400">{error}</div>
          )}
          <button type="submit" disabled={forgotLoading} className="w-full py-3 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-light shadow-brand-orange hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {forgotLoading ? '重置中...' : '重置密码'}
          </button>
        </div>
      )}
    </form>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 手机号 */}
      <div>
        <label className="block text-sm text-brand-text-muted mb-1.5">手机号</label>
        <div className="relative">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" maxLength={11} className="w-full pl-10 pr-4 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:border-brand-blue transition-colors" />
        </div>
      </div>

      {!isLogin && (
        <div>
          <label className="block text-sm text-brand-text-muted mb-1.5">短信验证码</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="输入验证码" maxLength={6} className="w-full pl-10 pr-4 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:border-brand-blue transition-colors" />
            </div>
            <button type="button" onClick={handleSendCode} disabled={codeLoading || codeTimer > 0 || !phone} className="shrink-0 px-4 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text-dim hover:text-brand-blue hover:border-brand-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {codeLoading ? '发送中...' : codeTimer > 0 ? `${codeTimer}s` : codeSent ? '重新发送' : <span className="flex items-center gap-1.5"><SendHorizonal className="w-3.5 h-3.5" />获取验证码</span>}
            </button>
          </div>
          <p className="text-xs text-brand-text-dim mt-1.5">💡 演示模式：验证码统一为 <code className="text-brand-orange bg-brand-orange/10 px-1 rounded">123456</code></p>
        </div>
      )}

      {isLogin && (
        <div className="flex justify-end -mt-2">
          <button type="button" onClick={() => { setIsForgot(true); setError('') }} className="text-xs text-brand-text-dim hover:text-brand-orange transition-colors">忘记密码？</button>
        </div>
      )}

      {isLogin && (
        <div className="p-3 bg-brand-blue/5 border border-brand-blue/20 rounded-lg space-y-1.5">
          <p className="text-xs text-brand-text-dim">快速体验：</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs"><span className="px-1.5 py-0.5 bg-amber-400/15 text-amber-400 rounded text-[10px]">超级管理员</span><code className="text-brand-text">adminboss</code><span className="text-brand-text-dim">/</span><code className="text-brand-text">root@admin</code></div>
            <div className="flex items-center gap-2 text-xs"><span className="px-1.5 py-0.5 bg-emerald-400/15 text-emerald-400 rounded text-[10px]">管理员</span><code className="text-brand-text">13800002222</code><span className="text-brand-text-dim">/</span><code className="text-brand-text">123456</code></div>
            <div className="flex items-center gap-2 text-xs"><span className="px-1.5 py-0.5 bg-brand-blue/15 text-brand-blue rounded text-[10px]">普通用户</span><code className="text-brand-text">13800001111</code><span className="text-brand-text-dim">/</span><code className="text-brand-text">123456</code></div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm text-brand-text-muted mb-1.5">密码</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
          <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" className="w-full pl-10 pr-12 py-3 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:border-brand-blue transition-colors" />
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-dim hover:text-brand-text transition-colors">{showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
      </div>

      {!isLogin && <div className="text-xs text-brand-text-dim">注册即表示同意《用户协议》和《隐私政策》</div>}
      {error && <div className="px-4 py-2.5 bg-red-400/10 border border-red-400/30 rounded-lg text-sm text-red-400">{error}</div>}

      <button type="submit" disabled={loading} className="w-full py-3 bg-brand-orange text-white font-semibold rounded-lg hover:bg-brand-orange-light shadow-brand-orange hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">{loading ? '处理中...' : isLogin ? '登录' : '注册'}</button>
    </form>
  )

  const tabArea = !isForgot ? (
    <div className="flex mb-6 bg-brand-panel rounded-lg p-1">
      <button onClick={() => { setIsLogin(true); setIsForgot(false) }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? 'bg-brand-orange text-white' : 'text-brand-text-dim hover:text-brand-text'}`}><LogIn className="w-4 h-4" />登录</button>
      <button onClick={() => { setIsLogin(false); setIsForgot(false) }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? 'bg-brand-orange text-white' : 'text-brand-text-dim hover:text-brand-text'}`}><UserPlus className="w-4 h-4" />注册</button>
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" />
                <path d="M12 22V15.5" />
                <path d="M22 8.5L2 15.5" />
                <path d="M2 8.5L22 15.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-text">
                3D<span className="text-brand-orange">Print</span>
              </h1>
              <p className="text-xs text-brand-text-dim font-mono">打个东西 - 3D打印智造中心</p>
            </div>
          </div>
        </div>

        {tabArea}

        <div className="card-base p-8">
          {formArea}
        </div>
        <div className="text-center mt-6">
          <div>
            {isForgot ? (
              <button type="button" onClick={() => { setIsForgot(false); setError(''); setResetDone(false) }} className="text-sm text-brand-text-dim hover:text-brand-blue transition-colors">
                ← 返回{resetDone ? '登录' : '登录/注册'}
              </button>
            ) : (
              <Link to="/" className="text-sm text-brand-text-dim hover:text-brand-blue transition-colors">
                ← 返回首页
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
