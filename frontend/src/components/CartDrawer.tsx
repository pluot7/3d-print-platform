import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, X, Plus, Minus, Trash2, Loader2,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getCartItems, removeCartItem, updateCartItem, clearCart,
  CartItemResponse,
} from '../api/cart'
import apiClient from '../api/client'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  /** 外部通知刷新 */
  refreshKey?: number
}

export default function CartDrawer({ open, onClose, refreshKey }: CartDrawerProps) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItemResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [backendTotal, setBackendTotal] = useState<number | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const fetchCart = async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      const res = await getCartItems()
      setItems(res.items)
      // 同时获取后端验证总价
      try {
        const totalRes = await apiClient.get('/api/cart/total')
        setBackendTotal(totalRes.data.total)
      } catch { /* 降级不阻塞 */ }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchCart()
  }, [open, refreshKey])

  // 点击遮罩关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (open) {
      // 延迟绑定防止触发自身
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  // Esc 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  const handleRemove = async (itemId: number) => {
    try {
      await removeCartItem(itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch (e) {
      console.error(e)
    }
  }

  // 防抖更新购物车（防止快速点击时多次 API 调用）
  const handleQuantityChange = async (item: CartItemResponse, delta: number) => {
    const newQty = Math.max(1, item.quantity + delta)
    if (newQty === item.quantity) return
    
    // 先乐观更新 UI
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, quantity: newQty } : i
    ))

    // 清除该商品的旧防抖定时器
    if (debounceTimers.current[item.id]) {
      clearTimeout(debounceTimers.current[item.id])
    }

    // 设置新的防抖定时器（300ms 后才调 API）
    debounceTimers.current[item.id] = setTimeout(async () => {
      setUpdatingId(item.id)
      try {
        await updateCartItem(item.id, { quantity: newQty })
        // 更新后端总价
        try {
          const totalRes = await apiClient.get('/api/cart/total')
          setBackendTotal(totalRes.data.total)
        } catch {}
      } catch (e) {
        console.error('更新购物车失败', e)
        // 回滚到原数量
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, quantity: item.quantity } : i
        ))
      } finally {
        setUpdatingId(null)
        delete debounceTimers.current[item.id]
      }
    }, 300)
  }

  const handleClear = async () => {
    try {
      await clearCart()
      setItems([])
    } catch (e) {
      console.error(e)
    }
  }

  // 价格：优先用后端总价，降级前端计算
  const frontendTotal = items.reduce((sum, item) => {
    const price = (item.model_price || 0) * Math.pow(item.scale, 3) * item.quantity
    return sum + price
  }, 0)
  const totalPrice = backendTotal ?? frontendTotal

  return (
    <>
      {/* 遮罩 */}
      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" />
      )}

      {/* 抽屉 */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-brand-panel border-l border-brand-border
                    z-50 transform transition-transform duration-300 shadow-2xl
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-orange" />
            <h2 className="text-lg font-bold text-brand-text">购物车</h2>
            {items.length > 0 && (
              <span className="px-2 py-0.5 bg-brand-orange/15 text-brand-orange text-xs rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-brand-text-dim hover:text-red-400 transition-colors"
              >
                清空
              </button>
            )}
            <button onClick={onClose} className="p-1 text-brand-text-dim hover:text-brand-text">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-brand-text-dim">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm mb-2">购物车是空的</p>
              <p className="text-xs">快去挑选心仪的模型吧</p>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className="card-base p-3 flex gap-3 transition-all"
                >
                  {/* 小图 */}
                  <div className="w-16 h-16 shrink-0 bg-brand-panel border border-brand-border rounded-lg
                                flex items-center justify-center overflow-hidden">
                    <svg className="w-8 h-8 text-brand-text-dim" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.8">
                      <path d="M32 8L56 22V42L32 56L8 42V22L32 8Z" />
                      <path d="M32 8V56" />
                    </svg>
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/model/${item.model_id}`}
                      onClick={onClose}
                      className="text-sm font-medium text-brand-text hover:text-brand-blue transition-colors truncate block"
                    >
                      {item.model_name}
                    </Link>
                    <div className="text-xs text-brand-text-dim mt-0.5">
                      {item.material} · {item.color} · {item.scale !== 1.0 ? `${(item.scale * 100).toFixed(0)}%` : '原大'}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {/* 数量控制 */}
                      <div className="flex items-center border border-brand-border rounded-md">
                        <button
                          onClick={() => handleQuantityChange(item, -1)}
                          disabled={item.quantity <= 1}
                          className="p-1 text-brand-text-dim hover:text-brand-text disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono text-brand-text min-w-[20px] text-center">
                          {updatingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin inline" />
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item, 1)}
                          className="p-1 text-brand-text-dim hover:text-brand-text"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {/* 价格 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-brand-orange">
                          ¥{((item.model_price || 0) * Math.pow(item.scale, 3) * item.quantity).toFixed(0)}
                        </span>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-1 text-brand-text-dim hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部结算 */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-brand-border bg-brand-panel">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-brand-text-dim">合计</span>
              <span className="text-xl font-bold text-brand-orange">¥{totalPrice.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                onClose()
                navigate('/checkout')
              }}
              className="w-full py-3 bg-brand-orange text-white font-semibold rounded-lg
                       hover:bg-brand-orange-light transition-all shadow-brand-orange"
            >
              去结算
            </button>
          </div>
        )}
      </div>
    </>
  )
}
