import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { MapPin, Phone, MessageSquare, CheckCircle, Clock, Truck, Loader2, AlertCircle, ChevronDown, ExternalLink, Wallet, Smartphone, ScanQrCode, CheckCheck, X } from 'lucide-react'
import { getModel, ModelResponse } from '../api/models'
import { createOrder, OrderResponse, payOrder, confirmPayment, PayOrderResponse } from '../api/orders'
import { getAddresses, AddressData } from '../api/addresses'

const steps = [
  { label: '确认订单', icon: CheckCircle },
  { label: '支付', icon: Clock },
  { label: '生产中', icon: Truck },
  { label: '已完成', icon: CheckCircle },
]

interface OrderConfig {
  material: string
  color: string
  precision: number
  quantity: number
  scale: number
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [model, setModel] = useState<ModelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)

  // 支付流程
  const [payMethod, setPayMethod] = useState<'balance' | 'wechat' | 'alipay'>('balance')
  const [paying, setPaying] = useState(false)
  const [payResult, setPayResult] = useState<PayOrderResponse | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [confirmingPay, setConfirmingPay] = useState(false)
  const [payConfirmed, setPayConfirmed] = useState(false)

  // 收货地址
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  // 从 location state 获取配置，或使用默认值
  const config: OrderConfig = location.state?.config || {
    material: 'PLA',
    color: '#FFFFFF',
    precision: 1.0,
    quantity: 1,
    scale: 1.0,
  }

  // 表单状态（手动输入时使用）
  const [manualMode, setManualMode] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [note, setNote] = useState('')

  // 加载模型信息
  useEffect(() => {
    const fetchModel = async () => {
      if (!id) return
      try {
        setLoading(true)
        const data = await getModel(parseInt(id))
        setModel(data)
        // 也加载地址
        const addrRes = await getAddresses()
        setAddresses(addrRes)
        if (addrRes.length > 0) {
          const defaultAddr = addrRes.find(a => a.is_default) || addrRes[0]
          setSelectedAddressId(defaultAddr.id)
        }
      } catch (err) {
        setError('加载模型信息失败')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchModel()
  }, [id])

  // 提交订单
  const handleSubmit = async () => {
    if (!model) return

    let rName = recipientName
    let rPhone = recipientPhone
    let rAddress = shippingAddress

    if (!manualMode) {
      // 从已选地址获取
      const addr = addresses.find(a => a.id === selectedAddressId)
      if (!addr) {
        setError('请选择收货地址')
        return
      }
      rName = addr.recipient_name
      rPhone = addr.recipient_phone
      rAddress = `${addr.province}${addr.city}${addr.district}${addr.detail_address}`
    }
    
    // 表单验证
    if (!rName.trim()) {
      setError('请填写收件人姓名')
      return
    }
    if (!rPhone.trim()) {
      setError('请填写联系电话')
      return
    }
    if (!rAddress.trim()) {
      setError('请填写收货地址')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      
      const order = await createOrder({
        model_id: model.id,
        print_config: {
          material: config.material,
          color: config.color,
          layer_height: config.precision === 1.5 ? 0.1 : config.precision === 1.0 ? 0.2 : 0.3,
          infill: 20,
          quantity: config.quantity,
        },
        recipient_name: rName,
        recipient_phone: rPhone,
        shipping_address: rAddress,
        note: note || undefined,
        use_balance: false,
        use_nova: false,
      })
      
      // 订单创建成功，跳转到支付流程
      setOrderId(order.id)
      setShowPayModal(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || '提交订单失败，请重试')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // 计算总价（考虑缩放）
  const basePrice = model?.base_price || 0
  const scale = config.scale || 1.0
  const scaledPrice = basePrice * Math.pow(scale, 3) * config.quantity

  // 执行支付
  const handlePay = async () => {
    if (!orderId) return
    setPaying(true)
    try {
      const result = await payOrder(orderId, {
        method: payMethod,
        use_nova: true,
      })
      setPayResult(result)
      
      if (result.status === 'paid') {
        setPayConfirmed(true)
        setTimeout(() => {
          setSuccess(true)
          setPayConfirmed(false)
        }, 1500)
      }
      
      // 如果是余额不足，显示信息并允许切支付方式
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : '支付失败，请重试')
    } finally {
      setPaying(false)
    }
  }

  // 模拟扫码确认支付
  const handleConfirmPay = async () => {
    if (!orderId) return
    setConfirmingPay(true)
    try {
      await confirmPayment(orderId)
      setPayConfirmed(true)
      setTimeout(() => {
        setSuccess(true)
        setPayConfirmed(false)
      }, 1500)
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      alert(typeof detail === 'string' ? detail : '支付确认失败')
    } finally {
      setConfirmingPay(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
      </div>
    )
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center">
        <p className="text-brand-text-dim mb-4">模型不存在</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          返回首页
        </button>
      </div>
    )
  }

  // 成功页面
  if (success) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="card-base p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-text mb-2">订单提交成功！</h2>
          <p className="text-brand-text-muted mb-2">订单号: {orderId}</p>
          <p className="text-sm text-brand-text-dim mb-6">
            请在用户中心查看订单状态
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/user')} className="btn-primary">
              查看订单
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              继续浏览
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-sm text-brand-text-dim mb-6">
          <Link to="/" className="hover:text-brand-blue transition-colors">首页</Link>
          <span>/</span>
          <Link to={`/model/${model.id}`} className="hover:text-brand-blue transition-colors">{model.name}</Link>
          <span>/</span>
          <span className="text-brand-text">确认订单</span>
        </div>

        {/* 步骤条 */}
        <div className="card-base p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => {
              const Icon = step.icon
              const isActive = i === 0
              const isDone = i === 0
              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-brand-blue text-white'
                        : isActive
                          ? 'bg-brand-orange text-white'
                          : 'bg-brand-panel border border-brand-border text-brand-text-dim'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-brand-orange font-medium' : 'text-brand-text-dim'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-20 h-[2px] mx-2 ${
                      isDone ? 'bg-brand-blue' : 'bg-brand-border'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 订单信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 模型信息 */}
            <div className="card-base p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-4">模型信息</h3>
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-brand-panel border border-brand-border rounded-xl
                              flex items-center justify-center">
                  <svg className="w-12 h-12 text-brand-text-dim" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.8">
                    <path d="M32 8L56 22V42L32 56L8 42V22L32 8Z" />
                    <path d="M32 8V56" />
                    <path d="M8 22L56 42" />
                    <path d="M56 22L8 42" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-brand-text">{model.name}</h4>
                  <div className="mt-1 text-sm text-brand-text-dim space-y-1">
                    <p>材质: {config.material} · {config.color === '#FFFFFF' ? '白色' : '自定义颜色'}</p>
                    {scale !== 1.0 && model && (
                      <p className="text-brand-orange">
                        打印缩放: ×{(scale * 100).toFixed(0)}%
                        （尺寸 {((model.dimensions_x || 0) * scale).toFixed(0)} × {((model.dimensions_y || 0) * scale).toFixed(0)} × {((model.dimensions_z || 0) * scale).toFixed(0)} mm）
                      </p>
                    )}
                    <p>精度: {config.precision === 1.5 ? '0.1mm 精细' : config.precision === 1.0 ? '0.2mm 标准' : '0.3mm 快速'}</p>
                    <p>数量: {config.quantity} 件</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-brand-orange">¥{scaledPrice.toFixed(0)}</div>
                </div>
              </div>
            </div>

            {/* 收货地址 */}
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-brand-text flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-orange" />
                  收货地址
                </h3>
                <button
                  onClick={() => setManualMode(!manualMode)}
                  className="text-xs text-brand-blue hover:text-brand-blue-light transition-colors"
                >
                  {manualMode ? '使用已保存地址' : '手动输入地址'}
                </button>
              </div>

              {manualMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-brand-text-dim mb-1">收件人 *</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="请输入收件人姓名"
                        className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                                 text-sm text-brand-text placeholder:text-brand-text-dim
                                 focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-brand-text-dim mb-1">联系电话 *</label>
                      <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="请输入手机号"
                        className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                                 text-sm text-brand-text placeholder:text-brand-text-dim
                                 focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-brand-text-dim mb-1">收货地址 *</label>
                    <textarea
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="请输入详细收货地址（省市区街道门牌号）"
                      rows={2}
                      className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                               text-sm text-brand-text placeholder:text-brand-text-dim
                               focus:outline-none focus:border-brand-blue resize-none"
                    />
                  </div>
                </div>
              ) : addresses.length === 0 ? (
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

            {/* 备注 */}
            <div className="card-base p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-3">订单备注</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如有特殊打印需求，请在此说明..."
                rows={3}
                className="w-full px-4 py-3 bg-brand-panel border border-brand-border rounded-lg
                         text-sm text-brand-text placeholder:text-brand-text-dim
                         focus:outline-none focus:border-brand-blue resize-none"
              />
            </div>
          </div>

          {/* 右侧 - 订单摘要 */}
          <div className="space-y-6">
            <div className="card-base p-5 border-brand-orange/30">
              <h3 className="text-sm font-semibold text-brand-text mb-4">订单摘要</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-text-dim">模型费用</span>
                  <span className="text-brand-text">¥{(basePrice * Math.pow(scale, 3)).toFixed(2)}</span>
                </div>
                {scale !== 1.0 && (
                  <div className="flex justify-between">
                    <span className="text-brand-text-dim">缩放系数</span>
                    <span className="text-brand-orange">×{(scale * scale * scale).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-brand-text-dim">精度</span>
                  <span className="text-brand-text">×{config.precision === 1.5 ? '0.1mm' : config.precision === 1.0 ? '0.2mm' : '0.3mm'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-dim">运费</span>
                  <span className="text-brand-blue">包邮</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-dim">数量</span>
                  <span className="text-brand-text">×{config.quantity}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-brand-border">
                <div className="flex justify-between items-baseline">
                  <span className="text-brand-text-muted">合计</span>
                  <span className="text-2xl font-bold text-brand-orange">¥{scaledPrice.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-4 py-3 bg-brand-orange text-white font-semibold rounded-lg
                         hover:bg-brand-orange-light shadow-brand-orange hover:shadow-lg transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中...
                  </span>
                ) : (
                  '提交订单'
                )}
              </button>
              <p className="mt-3 text-xs text-brand-text-dim text-center">
                点击提交即表示同意《用户协议》和《打印服务条款》
              </p>
            </div>

            {/* 联系方式 */}
            <div className="card-base p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-3">需要帮助？</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-brand-text-muted">
                  <Phone className="w-4 h-4 text-brand-orange" />
                  400-XXX-XXXX
                </div>
                <div className="flex items-center gap-2 text-sm text-brand-text-muted">
                  <MessageSquare className="w-4 h-4 text-brand-blue" />
                  在线客服
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 支付弹窗 */}
      {showPayModal && orderId && !success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => {
          if (!payResult && !payConfirmed) setShowPayModal(false)
        }}>
          <div className="card-base w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            {!payConfirmed ? (
              <>
                <button onClick={() => setShowPayModal(false)} className="absolute top-4 right-4 p-1 text-brand-text-dim hover:text-brand-text rounded-lg">
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-semibold text-brand-text mb-1">选择支付方式</h3>
                <p className="text-xs text-brand-text-dim mb-5">订单号: {orderId}</p>

                {/* 支付方式选择 */}
                <div className="space-y-3 mb-6">
                  {[
                    { id: 'balance' as const, icon: Wallet, label: '余额支付', desc: '余额快速支付' },
                    { id: 'wechat' as const, icon: Smartphone as any, label: '微信支付', desc: '扫码支付' },
                    { id: 'alipay' as const, icon: Smartphone as any, label: '支付宝', desc: '扫码支付' },
                  ].map(pm => {
                    const Icon = pm.icon
                    const isWechatOrAlipay = pm.id === 'wechat' || pm.id === 'alipay'
                    return (
                      <button
                        key={pm.id}
                        onClick={() => {
                          setPayMethod(pm.id)
                          setPayResult(null)
                          setError('')
                        }}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          payMethod === pm.id
                            ? 'border-brand-orange bg-brand-orange/5'
                            : 'border-brand-border/50 hover:border-brand-blue/30 bg-brand-panel'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          pm.id === 'balance'
                            ? 'bg-emerald-400/15 text-emerald-400'
                            : isWechatOrAlipay
                              ? (pm.id === 'wechat' ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400')
                              : 'bg-brand-blue/10 text-brand-blue'
                        }`}>
                          {pm.id === 'wechat' || pm.id === 'alipay' ? (
                            <ScanQrCode className="w-5 h-5" />
                          ) : (
                            <Wallet className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-brand-text">{pm.label}</p>
                          <p className="text-xs text-brand-text-dim">{pm.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          payMethod === pm.id
                            ? 'border-brand-orange bg-brand-orange'
                            : 'border-brand-border'
                        }`}>
                          {payMethod === pm.id && (
                            <CheckCheck className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* 支付结果信息 */}
                {payResult && payResult.status === 'partial' && (
                  <div className="mb-4 p-3 bg-brand-orange/10 border border-brand-orange/20 rounded-lg">
                    <p className="text-sm text-brand-orange">{payResult.message}</p>
                    <p className="text-xs text-brand-text-dim mt-1">请选择其他支付方式完成剩余 ¥{payResult.remaining.toFixed(2)}</p>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* 支付操作按钮 */}
                <div className="space-y-3">
                  {payMethod === 'balance' ? (
                    <button
                      onClick={handlePay}
                      disabled={paying}
                      className="w-full py-3 bg-gradient-to-r from-brand-orange to-brand-orange-dark text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                    >
                      {paying ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> 支付中...</>
                      ) : (
                        <><Wallet className="w-4 h-4" /> 余额支付</>
                      )}
                    </button>
                  ) : (
                    <>
                      {/* 模拟二维码展示 */}
                      <div className="flex flex-col items-center py-4">
                        <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-3">
                          <div className="text-center">
                            <ScanQrCode className="w-20 h-20 mx-auto text-gray-800" />
                            <p className="text-[10px] text-gray-400 mt-2">模拟二维码</p>
                          </div>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium text-brand-text">
                            {payMethod === 'wechat' ? '微信' : '支付宝'}扫码支付
                          </p>
                          <p className="text-xs text-brand-text-dim">实际部署后替换为真实二维码</p>
                        </div>
                      </div>

                      <button
                        onClick={handlePay}
                        disabled={paying}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                      >
                        {paying ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> 生成二维码...</>
                        ) : (
                          <><ScanQrCode className="w-4 h-4" /> 生成 {payMethod === 'wechat' ? '微信' : '支付宝'}支付码</>
                        )}
                      </button>

                      {/* 扫码支付后模拟确认 */}
                      {payResult && payResult.status === 'pending_online' && (
                        <div className="mt-3 p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-xl">
                          <p className="text-xs text-brand-text-dim mb-2">📱 演示环境：扫码后点击下方按钮模拟支付完成</p>
                          <button
                            onClick={handleConfirmPay}
                            disabled={confirmingPay}
                            className="w-full py-2.5 bg-brand-blue text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-brand-blue-dark transition-all disabled:opacity-60"
                          >
                            {confirmingPay ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> 确认中...</>
                            ) : (
                              <><CheckCheck className="w-4 h-4" /> 我已扫码完成支付</>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border/50">
                  <div className="text-sm">
                    <div className="flex justify-between text-brand-text-dim">
                      <span>订单金额</span>
                      <span className="text-brand-text">¥{scaledPrice.toFixed(2)}</span>
                    </div>
                    {payResult && payResult.nova_discount > 0 && (
                      <div className="flex justify-between text-brand-text-dim mt-1">
                        <span>Nova豆折扣</span>
                        <span className="text-emerald-400">-¥{payResult.nova_discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-brand-border/30">
                      <span className="text-brand-text">应付</span>
                      <span className="text-brand-orange text-lg">
                        ¥{payResult ? (payResult.total_price - payResult.nova_discount).toFixed(2) : scaledPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* 支付成功 */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-400/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCheck className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-brand-text mb-1">支付成功！</h3>
                <p className="text-sm text-brand-text-dim mb-6">订单 #{orderId} 已支付</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => navigate('/user')} className="btn-primary">
                    查看订单
                  </button>
                  <button onClick={() => navigate('/')} className="btn-secondary">
                    继续浏览
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
