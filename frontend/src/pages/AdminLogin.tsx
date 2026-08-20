import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react'
import apiClient from '../api/client'

export default function AdminLogin() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

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

      // 检查是否为管理员
      if (role !== 'admin' && role !== 'super_admin') {
        setError('此账号不是管理员，无法登录管理后台')
        setLoading(false)
        return
      }

      // 手动存 token + 用户信息（格式与 AuthContext 一致）
      localStorage.setItem('3dprint_token', data.access_token)
      const userInfo = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email || undefined,
        phone: data.user.phone || undefined,
        role,
        avatar: data.user.avatar_url ? `/${data.user.avatar_url}` : undefined,
        balance: data.user.balance || 0,
        nova_coins: data.user.nova_coins || 0,
        created_at: data.user.created_at || '',
        is_active: data.user.is_active,
        is_verified: data.user.is_verified,
      }
      localStorage.setItem('3dprint_user', JSON.stringify(userInfo))

      // 全页面刷新强制重新加载 AuthContext
      window.location.href = '/'
    } catch (err: any) {
      setError(err?.response?.data?.detail || '账号或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
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

        {/* 表单 */}
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

          <div className="mt-6 pt-4 border-t border-brand-border text-center">
            <a href="http://localhost:3000"
              className="text-xs text-brand-text-dim hover:text-brand-blue transition-colors"
              target="_blank"
            >
              ← 返回前台
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-brand-text-dim/40 mt-6">
          仅限管理员访问 · 3D打印智造中心
        </p>
      </div>
    </div>
  )
}
