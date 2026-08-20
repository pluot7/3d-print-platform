import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon, Printer, User, ShoppingCart, Upload, Grid3X3, Shield, LogOut, Settings, ChevronDown, MessageSquare, Bell, Rss } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import CartDrawer from './CartDrawer'

const navLinks = [
  { to: '/', label: '模型市场', icon: Grid3X3 },
  { to: '/official', label: '官方模型', icon: Shield },
  { to: '/community', label: '社区', icon: MessageSquare },
  { to: '/announcements', label: '公告', icon: Bell },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartRefreshKey, setCartRefreshKey] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 路由变化时关闭菜单
  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  // 轮询未读消息数 - 监听路由变化即时刷新
  const fetchUnread = useCallback(() => {
    if (!isAuthenticated) return
    import('../api/notifications').then(m => m.getUnreadCount()).then(c => setUnreadCount(c.notifications + c.conversations)).catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    fetchUnread()
    const timer = setInterval(fetchUnread, 30000)
    return () => clearInterval(timer)
  }, [fetchUnread])

  // 路由变化时即时刷新未读数
  useEffect(() => {
    fetchUnread()
  }, [location.pathname, fetchUnread])

  // 监听全局 unread-refresh 事件（来自私信页的一键已读）
  useEffect(() => {
    const handler = () => fetchUnread()
    window.addEventListener('unread-refresh', handler)
    return () => window.removeEventListener('unread-refresh', handler)
  }, [fetchUnread])

  // 每次打开购物车时刷新计数
  useEffect(() => {
    if (cartOpen) {
      import('../api/cart').then(m => m.getCartItems()).then(res => {
        setCartCount(res.total)
      }).catch(() => {})
    }
  }, [cartOpen, cartRefreshKey])

  const roleLabel: Record<string, string> = {
    guest: '游客',
    user: '普通用户',
    admin: '管理员',
    super_admin: '超级管理员',
  }

  const roleColor: Record<string, string> = {
    guest: 'text-brand-text-dim',
    user: 'text-brand-text-muted',
    admin: 'text-brand-blue',
    super_admin: 'text-amber-400',
  }

  const openCart = () => {
    setCartOpen(true)
    setCartRefreshKey(k => k + 1)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-brand-panel/90 backdrop-blur-xl border-b border-brand-border">
        {/* 顶部装饰线 */}
        <div className="h-[2px] bg-gradient-brand" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-brand rounded-lg flex items-center justify-center
                            group-hover:shadow-brand-orange transition-shadow duration-300">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-brand-text tracking-wide">
                  3D<span className="text-brand-orange">Print</span>
                </span>
                <span className="hidden sm:inline text-xs text-brand-text-dim ml-2 font-mono">
                  STUDIO
                </span>
              </div>
            </Link>

            {/* 桌面端导航 */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to
                const Icon = link.icon
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'text-brand-orange bg-brand-orange/10'
                        : 'text-brand-text-muted hover:text-brand-text hover:bg-white/5'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-2">
              {/* 主题切换按钮 */}
              <button
                onClick={toggleTheme}
                className="p-2.5 text-brand-text-muted hover:text-brand-orange
                         hover:bg-brand-orange/10 rounded-lg transition-all"
                title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* 消息通知按钮 */}
              {isAuthenticated && (
                <Link
                  to="/messages"
                  className="relative p-2.5 text-brand-text-muted hover:text-brand-orange
                           hover:bg-brand-orange/10 rounded-lg transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-orange text-white
                                    text-xs font-bold rounded-full flex items-center justify-center
                                    shadow-lg shadow-brand-orange/30">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* 动态广场按钮 */}
              {isAuthenticated && (
                <Link
                  to="/activities"
                  className="p-2.5 text-brand-text-muted hover:text-brand-orange
                           hover:bg-brand-orange/10 rounded-lg transition-all"
                  title="动态广场"
                >
                  <Rss className="w-5 h-5" />
                </Link>
              )}

              {/* 购物车按钮 */}
              {isAuthenticated && (
                <button
                  onClick={openCart}
                  className="relative p-2.5 text-brand-text-muted hover:text-brand-orange
                           hover:bg-brand-orange/10 rounded-lg transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-orange text-white
                                    text-xs font-bold rounded-full flex items-center justify-center
                                    shadow-lg shadow-brand-orange/30">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* 已登录：用户头像下拉 */}
              {isAuthenticated && user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-card border border-brand-border
                             rounded-lg hover:border-brand-blue/50 transition-all duration-200"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-7 h-7 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                          const parent = (e.target as HTMLImageElement).parentElement
                          if (parent) {
                            parent.innerHTML = '<div class="w-7 h-7 bg-gradient-brand rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>'
                          }
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 bg-gradient-brand rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-brand-text leading-tight">{user.username}</div>
                      <div className={`text-xs ${roleColor[user?.role || 'user']} leading-tight`}>{roleLabel[user?.role || 'user']}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-brand-text-dim transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 下拉菜单 */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-brand-panel border border-brand-border
                                  rounded-xl shadow-card overflow-hidden z-50">
                      {/* 用户信息 */}
                      <div className="px-4 py-3 border-b border-brand-border">
                        <div className="text-sm font-medium text-brand-text">{user.username}</div>
                        <div className={`text-xs ${roleColor[user?.role || 'user']} mt-0.5`}>{roleLabel[user?.role || 'user']}</div>
                      </div>

                      {/* 菜单项 */}
                      <div className="py-1">
                        <Link
                          to="/messages"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-text-muted
                                   hover:text-brand-text hover:bg-white/5 transition-colors relative"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Bell className="w-4 h-4" />
                          消息通知
                          {unreadCount > 0 && (
                            <span className="ml-auto bg-brand-orange text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/activities"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-text-muted
                                   hover:text-brand-text hover:bg-white/5 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Rss className="w-4 h-4" />
                          动态广场
                        </Link>
                        <div className="my-1 border-t border-brand-border" />
                        <Link
                          to={`/user/${user.id}`}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-text-muted
                                   hover:text-brand-text hover:bg-white/5 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          我的主页
                        </Link>
                        <Link
                          to="/user"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-text-muted
                                   hover:text-brand-text hover:bg-white/5 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          我的订单
                        </Link>
                        <Link
                          to="/user"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-text-muted
                                   hover:text-brand-text hover:bg-white/5 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Upload className="w-4 h-4" />
                          上传模型
                        </Link>
                        <div className="my-1 border-t border-brand-border" />
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400
                                   hover:bg-red-400/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 未登录：登录按钮 */
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white text-sm
                           font-semibold rounded-lg hover:bg-brand-orange-light
                           shadow-brand-orange hover:shadow-lg transition-all duration-300"
                >
                  <User className="w-4 h-4" />
                  登录 / 注册
                </Link>
              )}

              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-brand-text-muted hover:text-brand-text"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileOpen && (
          <div className="md:hidden border-t border-brand-border bg-brand-panel/95 backdrop-blur-xl">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-brand-text-muted
                             hover:text-brand-text hover:bg-white/5 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                )
              })}

              {isAuthenticated && (
                <>
                  <div className="border-t border-brand-border my-2" />
                  <button
                    onClick={() => { setMobileOpen(false); openCart() }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-brand-text-muted
                             hover:text-brand-text hover:bg-white/5 transition-colors w-full text-left"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    购物车 {cartCount > 0 && `(${cartCount})`}
                  </button>
                  <Link
                    to="/user"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-brand-text-muted
                             hover:text-brand-text hover:bg-white/5 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    个人中心
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* 购物车抽屉 */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} refreshKey={cartRefreshKey} />
    </>
  )
}
