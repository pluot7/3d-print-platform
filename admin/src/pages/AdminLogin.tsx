import { useState } from 'react'
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react'
import apiClient from '../api/client'

export default function AdminLogin() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone) { setError('请输入账号'); return }
    if (!password) { setError('请输入密码'); return }

    setLoading(true)
    try {
      const res = await apiClient.post('/api/auth/login', { phone, password })
      const data = res.data
      const role = (data.user.role || '').toLowerCase()

      if (role !== 'admin') {
        setError('此账号不是管理员，无法登录管理后台')
        setLoading(false)
        return
      }

      // 用独立的 key，跟用户端互不影响
      localStorage.setItem('3dprint_admin_token', data.access_token)
      const adminUser = {
        id: data.user.id,
        username: data.user.username,
        phone: data.user.phone || '',
        role,
        avatar: data.user.avatar_url ? `/${data.user.avatar_url}` : undefined,
      }
      localStorage.setItem('3dprint_admin_user', JSON.stringify(adminUser))

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } catch (err: any) {
      setError(err?.response?.data?.detail || '账号或密码错误')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-brand-text mb-2">登录成功</h2>
          <p className="text-brand-text-dim">正在跳转管理后台...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-orange to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-orange/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-brand-text">
                3D<span className="text-brand-orange">Print</span>
              </h1>
              <p className="text-xs text-brand-text-dim font-mono mt-0.5">管理后台</p>
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <h2 className="text-lg font-semibold text-brand-text mb-1">管理员登录</h2>
          <p className="text-xs text-brand-text-dim mb-6">请使用管理员账号登录</p>

          {error && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-brand-text-dim mb-1.5">账号</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="手机号 / 管理员账号"
                className="input-base w-full text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-dim mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="input-base w-full text-sm pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-dim hover:text-brand-text">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? '登录中...' : '登录管理后台'}
            </button>
          </form>


        </div>

        <p className="text-center text-xs text-brand-text-dim/40 mt-6">
          仅限管理员访问 · 3D打印智造中心
        </p>
      </div>
    </div>
  )
}
