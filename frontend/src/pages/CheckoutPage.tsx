import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Trash2, Loader2, MapPin, Plus, Minus, ChevronDown, ExternalLink } from 'lucide-react'
import { getCartItems, CartItemResponse, removeCartItem, updateCartItem } from '../api/cart'
import { getAddresses, AddressData } from '../api/addresses'
import { createOrder } from '../api/orders'
import { useAuth } from '../contexts/AuthContext'

export default function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItemResponse[]>([])
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    const fetch = async () => {
      try {
        const [cartRes, addrRes] = await Promise.all([
          getCartItems(),
          getAddresses(),
        ])
        setItems(cartRes.items)
        setAddresses(addrRes)
        // 默认选中第一个地址
        if (addrRes.length > 0) {
          const defaultAddr = addrRes.find(a => a.is_default) || addrRes[0]
          setSelectedAddressId(defaultAddr.id)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user])

  // 修改数量
  const handleQuantityChange = async (item: CartItemResponse, delta: number) => {
    const newQty = item.quantity + delta
    if (newQty < 1) {
      // 减到0就删除
      try {
        await removeCartItem(item.id)
        setItems(prev => prev.filter(x => x.id !== item.id))
      } catch {}
      return
    }
    try {
      await updateCartItem(item.id, { quantity: newQty })
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, quantity: newQty } : x))
    } catch {}
  }

  // 删除购物车项
  const handleRemove = async (id: number) => {
    try {
      await removeCartItem(id)
      setItems(prev => prev.filter(x => x.id !== id))
    } catch {}
  }

  const totalPrice = items.reduce((sum, item) => {
    const modelPrice = item.model_price || 0
    const scale = item.scale || 1
    return sum + modelPrice * Math.pow(scale, 3) * item.quantity
  }, 0)

  // 提交订单
  const handleSubmitOrder = async () => {
    if (items.length === 0) return alert('购物车为空')
    if (!selectedAddressId) return alert('请选择收货地址')

    // 找到选中地址
    const addr = addresses.find(a => a.id === selectedAddressId)
    if (!addr) return alert('请选择收货地址')

    setSubmitting(true)
    try {
      // 为每个购物车项创建订单
      const orderPromises = items.map(item =>
        createOrder({
          model_id: item.model_id,
          print_config: {
            material: item.material || 'pla',
            color: item.color || '#ffffff',
            layer_height: item.layer_height || 0.15,
            infill: item.infill || 15,
            quantity: item.quantity,
            scale: item.scale || 1,
          },
          recipient_name: addr.recipient_name,
          recipient_phone: addr.recipient_phone,
          shipping_address: `${addr.province}${addr.city}${addr.district}${addr.detail_address}`,
          use_balance: false,
          use_nova: false,
        })
      )
      await Promise.all(orderPromises)

      // 清空购物车
      await Promise.all(items.map(item => removeCartItem(item.id)))

      alert('订单提交成功！')
      navigate('/user')
    } catch (e: any) {
      alert(e?.response?.data?.detail || '下单失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 text-center py-20">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-brand-text-dim opacity-30" />
          <p className="text-brand-text-dim mb-4">购物车是空的</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            去逛逛
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate(-1)} className="p-1 hover:text-brand-orange transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="section-title text-xl">订单结算</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：购物车商品 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-base p-5">
              <h2 className="text-sm font-semibold text-brand-text mb-4">
                购物车商品 ({items.length} 件)
              </h2>
              <div className="space-y-3">
                {items.map(item => {
                  const modelPrice = item.model_price || 0
                  const scale = item.scale || 1
                  const scaledPrice = modelPrice * Math.pow(scale, 3)

                  return (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-brand-border/30">
                      {/* 模型缩略 */}
                      <div className="w-16 h-16 rounded-lg bg-gradient-brand/20 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-brand-blue/60">
                          {item.model_name?.[0] || '3D'}
                        </span>
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-text truncate">
                          {item.model_name || `模型 #${item.model_id}`}
                        </p>
                        <p className="text-xs text-brand-text-dim mt-0.5">
                          单价: ¥{scaledPrice.toFixed(0)} {scale !== 1 && `(缩放 ${(scale * 100).toFixed(0)}%)`}
                        </p>
                      </div>

                      {/* 数量调整 */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuantityChange(item, -1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-dim hover:text-brand-text hover:bg-white/[0.05] transition-colors"
                        >
                          {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="w-8 text-center text-sm text-brand-text">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item, 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-dim hover:text-brand-text hover:bg-white/[0.05] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 小计 */}
                      <div className="text-right shrink-0 w-20">
                        <p className="text-sm font-semibold text-brand-orange">
                          ¥{(scaledPrice * item.quantity).toFixed(0)}
                        </p>
                      </div>

                      {/* 删除 */}
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 rounded-lg text-brand-text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 收货地址 */}
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-brand-text flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-orange" />
                  收货地址
                </h2>
              </div>
              {addresses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-brand-text-dim mb-3">暂未添加收货地址</p>
                  <button
                    onClick={() => navigate('/user')}
                    className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:text-brand-blue-light transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    前往用户中心添加
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAddressId ?? ''}
                    onChange={e => setSelectedAddressId(Number(e.target.value))}
                    className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 pr-10
                             text-sm text-brand-text appearance-none cursor-pointer
                             focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30
                             transition-colors"
                  >
                    {addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>
                        {addr.recipient_name} | {addr.recipient_phone} | {addr.province}{addr.city}{addr.district}{addr.detail_address}{addr.is_default ? ' (默认)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim pointer-events-none" />

                  {/* 选中地址详情卡片 */}
                  {selectedAddressId && (() => {
                    const addr = addresses.find(a => a.id === selectedAddressId)
                    if (!addr) return null
                    return (
                      <div className="mt-2 px-4 py-2.5 rounded-lg bg-brand-orange/[0.04] border border-brand-orange/20">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-brand-text">
                            {addr.recipient_name}　{addr.recipient_phone}
                            {addr.is_default && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-brand-orange/20 text-brand-orange rounded">默认</span>
                            )}
                          </p>
                          <button
                            onClick={() => navigate('/user')}
                            className="text-xs text-brand-blue hover:text-brand-blue-light transition-colors shrink-0 ml-2"
                          >
                            管理
                          </button>
                        </div>
                        <p className="text-xs text-brand-text-dim mt-0.5">
                          {addr.province}{addr.city}{addr.district}{addr.detail_address}
                        </p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：订单摘要 */}
          <div className="lg:col-span-1">
            <div className="card-base p-5 sticky top-24">
              <h2 className="text-sm font-semibold text-brand-text mb-4">订单摘要</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-brand-text-dim">
                  <span>商品数量</span>
                  <span>{items.reduce((s, i) => s + i.quantity, 0)} 件</span>
                </div>
                <div className="flex justify-between text-brand-text-dim">
                  <span>模型种类</span>
                  <span>{items.length} 种</span>
                </div>
                <div className="border-t border-brand-border/50 my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>合计</span>
                  <span className="text-brand-orange">¥{totalPrice.toFixed(0)}</span>
                </div>
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={submitting || !selectedAddressId}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    提交订单
                  </>
                )}
              </button>
              <p className="text-[10px] text-brand-text-dim text-center mt-2">
                提交后将创建独立的订单，可分别追踪物流
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
