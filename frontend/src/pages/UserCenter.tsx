import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  User, Package, Box, MapPin, Settings, Shield, Eye,
  AlertCircle, LogOut, ChevronRight, LayoutDashboard, Upload, Trash2, Loader2,
  Plus, Edit3, Check, Star, X, Info, ShoppingCart, Wallet, Coins, Camera,
  Heart, Clock, ArrowUpDown
} from 'lucide-react'
import { getMyModels, deleteModel, ModelResponse } from '../api/models'
import { getMyOrders, cancelOrder, deleteOrder, getOrder, OrderResponse } from '../api/orders'
import { getBalance, recharge, BalanceResponse } from '../api/wallet'
import { updateProfile, changePassword, uploadAvatar, sendSmsCode } from '../api/auth'
import { getNotificationPreferences, updateNotificationPreferences } from '../api/notifications'
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress, AddressData, AddressCreateData } from '../api/addresses'
import { getFavorites, removeFavorite, FavoriteItem } from '../api/favorites'
import UploadModal from '../components/UploadModal'

type TabId = 'orders' | 'models' | 'favorites' | 'address' | 'account' | 'profile'

const userTabs: { id: TabId; label: string; icon: typeof Package }[] = [
  { id: 'orders', label: '我的订单', icon: Package },
  { id: 'models', label: '我的模型', icon: Box },
  { id: 'favorites', label: '我的收藏', icon: Heart },
  { id: 'address', label: '收货地址', icon: MapPin },
  { id: 'account', label: '我的账户', icon: Wallet },
  { id: 'profile', label: '个人设置', icon: Settings },
]

// 订单状态映射
const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'text-brand-orange bg-brand-orange/10' },
  paid: { label: '已付款', color: 'text-brand-blue bg-brand-blue/10' },
  printing: { label: '生产中', color: 'text-brand-blue bg-brand-blue/10' },
  shipped: { label: '已发货', color: 'text-emerald-400 bg-emerald-400/10' },
  completed: { label: '已完成', color: 'text-brand-text-dim bg-white/5' },
  cancelled: { label: '已取消', color: 'text-red-400 bg-red-400/10' },
}

// 模型状态映射
const modelStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '审核中', color: 'text-brand-orange' },
  approved: { label: '已上架', color: 'text-emerald-400' },
  rejected: { label: '已拒绝', color: 'text-red-400' },
}

export default function UserCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('orders')
  const { user, isAdmin, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  // 真实数据
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [models, setModels] = useState<ModelResponse[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(false)

  // 分页+排序状态
  const [modelsPage, setModelsPage] = useState(1)
  const [modelsTotal, setModelsTotal] = useState(0)
  const [modelsSort, setModelsSort] = useState<'latest' | 'oldest'>('latest')
  const [modelsLoadingMore, setModelsLoadingMore] = useState(false)
  const [favPage, setFavPage] = useState(1)
  const [favTotal, setFavTotal] = useState(0)
  const [favSort, setFavSort] = useState<'latest' | 'oldest'>('latest')
  const [favLoadingMore, setFavLoadingMore] = useState(false)
  const MODELS_PAGE_SIZE = 10
  const FAV_PAGE_SIZE = 12

  // 上传弹窗
  const [showUpload, setShowUpload] = useState(false)

  // 取消订单
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)
  const [detailOrder, setDetailOrder] = useState<OrderResponse | null>(null)

  // 收货地址
  const [addresses, setAddresses] = useState<AddressData[]>([])
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressData | null>(null)
  const [addressForm, setAddressForm] = useState<AddressCreateData>({
    recipient_name: '', recipient_phone: '',
    province: '', city: '', district: '', detail_address: '',
    is_default: false,
  })
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)

  // 钱包
  const [walletData, setWalletData] = useState<BalanceResponse | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState(100)
  const [recharging, setRecharging] = useState(false)

  // 个人资料
  const [profileForm, setProfileForm] = useState({ username: '', phone: '', phone_code: '' })
  const [phoneCodeSending, setPhoneCodeSending] = useState(false)
  const [phoneCodeCountdown, setPhoneCodeCountdown] = useState(0)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneForm, setPhoneForm] = useState({ phone: '', phone_code: '' })
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [notifyPrefs, setNotifyPrefs] = useState({ notify_activities: true, notify_messages: true })

  // 头像上传
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 校验大小
    if (file.size > 5 * 1024 * 1024) {
      alert('头像文件不能超过 5MB')
      return
    }

    // 校验类型
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('仅支持 JPG/PNG/GIF/WebP 格式')
      return
    }

    setAvatarUploading(true)
    try {
      const avatarUrl = await uploadAvatar(file)
      // 刷新用户状态（saveAuth 会自动处理完整 URL）
      await refreshUser()
    } catch (err: any) {
      console.error('Avatar upload failed:', err)
      alert(err.response?.data?.detail || '头像上传失败')
    } finally {
      setAvatarUploading(false)
      // 重置 input 以便重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 发送手机验证码
  const handleSendPhoneCode = async () => {
    const phone = phoneForm.phone || ''
    if (!phone || phone.length !== 11) {
      alert('请输入正确的11位手机号')
      return
    }
    setPhoneCodeSending(true)
    try {
      await sendSmsCode(phone)
      setPhoneCodeCountdown(60)
      const timer = setInterval(() => {
        setPhoneCodeCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      alert(err.response?.data?.detail || '验证码发送失败')
    } finally {
      setPhoneCodeSending(false)
    }
  }

  const handleChangePhone = async () => {
    const phone = phoneForm.phone?.trim()
    const code = phoneForm.phone_code?.trim()
    if (!phone || phone.length !== 11) {
      alert('请输入正确的11位手机号')
      return
    }
    if (!code) {
      alert('请先获取验证码')
      return
    }
    try {
      await updateProfile({ phone, phone_code: code })
      await refreshUser()
      setShowPhoneModal(false)
      setPhoneForm({ phone: '', phone_code: '' })
      setPhoneCodeCountdown(0)
      alert('手机号修改成功')
    } catch (err: any) {
      alert(err.response?.data?.detail || '修改失败')
    }
  }

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (activeTab === 'orders') {
          const data = await getMyOrders()
          setOrders(data)
        } else if (activeTab === 'models') {
          const data = await getMyModels({ page: 1, page_size: MODELS_PAGE_SIZE, sort: modelsSort === 'oldest' ? 'oldest' : undefined })
          setModels(data.items)
          setModelsTotal(data.total)
          setModelsPage(1)
        } else if (activeTab === 'favorites') {
          const data = await getFavorites(1, favSort === 'oldest' ? 'oldest' : undefined)
          setFavorites(data.items)
          setFavTotal(data.total)
          setFavPage(1)
        } else if (activeTab === 'address') {
          const data = await getAddresses()
          setAddresses(data)
        } else if (activeTab === 'account') {
          const data = await getBalance()
          setWalletData(data)
        } else if (activeTab === 'profile') {
          if (user) {
            setProfileForm({ username: user.username, phone: '', phone_code: '' })
          }
          try {
            const prefs = await getNotificationPreferences()
            setNotifyPrefs({
              notify_activities: prefs.notify_activities,
              notify_messages: prefs.notify_messages,
            })
          } catch (e) { console.error(e) }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeTab])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 上传成功后刷新
  const handleUploadSuccess = async () => {
    const data = await getMyModels({ page: 1, page_size: MODELS_PAGE_SIZE, sort: modelsSort === 'oldest' ? 'oldest' : undefined })
    setModels(data.items)
    setModelsTotal(data.total)
    setModelsPage(1)
  }

  // 删除模型
  const handleDeleteModel = async (id: number) => {
    if (!confirm('确定要删除这个模型吗？')) return
    try {
      await deleteModel(id)
      setModels(models.filter(m => m.id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // 取消订单
  const handleCancelOrder = async (id: number) => {
    try {
      setCancellingId(id)
      await cancelOrder(id)
      setOrders(orders.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    } catch (err: any) {
      alert(err.response?.data?.detail || '取消失败')
    } finally {
      setCancellingId(null)
    }
  }

  // 删除订单
  const handleDeleteOrder = async (id: number) => {
    if (!confirm('确定要删除此订单吗？此操作不可恢复。')) return
    try {
      setDeletingOrderId(id)
      await deleteOrder(id)
      setOrders(orders.filter(o => o.id !== id))
    } catch (err: any) {
      alert(err.response?.data?.detail || '删除失败')
    } finally {
      setDeletingOrderId(null)
    }
  }

  // 查看订单详情
  const handleViewDetail = async (id: number) => {
    try {
      const detail = await getOrder(id)
      setDetailOrder(detail)
    } catch (err: any) {
      alert(err.response?.data?.detail || '加载订单详情失败')
    }
  }

  // 打开新增地址表单
  const handleAddAddress = () => {
    setEditingAddress(null)
    setAddressForm({
      recipient_name: '', recipient_phone: '',
      province: '', city: '', district: '', detail_address: '',
      is_default: addresses.length === 0,
    })
    setShowAddressForm(true)
  }

  // 打开编辑地址表单
  const handleEditAddress = (addr: AddressData) => {
    setEditingAddress(addr)
    setAddressForm({
      recipient_name: addr.recipient_name,
      recipient_phone: addr.recipient_phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail_address: addr.detail_address,
      is_default: addr.is_default,
    })
    setShowAddressForm(true)
  }

  // 保存地址（新增或编辑）
  const handleSaveAddress = async () => {
    try {
      setAddressSaving(true)
      if (editingAddress) {
        await updateAddress(editingAddress.id, addressForm)
      } else {
        await createAddress(addressForm)
      }
      const data = await getAddresses()
      setAddresses(data)
      setShowAddressForm(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || '保存失败')
    } finally {
      setAddressSaving(false)
    }
  }

  // 删除地址
  const handleDeleteAddress = async (id: number) => {
    if (!confirm('确定要删除这个地址吗？')) return
    try {
      setAddressLoading(true)
      await deleteAddress(id)
      const data = await getAddresses()
      setAddresses(data)
    } catch (err: any) {
      alert(err.response?.data?.detail || '删除失败')
    } finally {
      setAddressLoading(false)
    }
  }

  // 设为默认地址
  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultAddress(id)
      const data = await getAddresses()
      setAddresses(data)
    } catch (err: any) {
      alert(err.response?.data?.detail || '设置失败')
    }
  }

  // 充值
  const handleRecharge = async () => {
    if (rechargeAmount <= 0) {
      alert('请输入有效的充值金额')
      return
    }
    try {
      setRecharging(true)
      const result = await recharge(rechargeAmount)
      setWalletData(prev => prev ? { ...prev, balance: result.balance } : { balance: result.balance, nova_coins: 0 })
      alert(`充值成功！当前余额: ¥${result.balance.toFixed(2)}`)
    } catch (err: any) {
      alert(err.response?.data?.detail || '充值失败')
    } finally {
      setRecharging(false)
    }
  }

  // 保存个人资料
  const handleSaveProfile = async () => {
    setProfileError('')
    setProfileSuccess('')
    if (!profileForm.username.trim()) {
      setProfileError('用户名不能为空')
      return
    }
    try {
      setProfileSaving(true)
      const payload: any = {
        username: profileForm.username.trim(),
      }
      const result = await updateProfile(payload)
      // 刷新用户状态
      await refreshUser()
      setProfileForm({ username: result.username, phone: '', phone_code: '' })
      setProfileSuccess('个人资料已更新')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setProfileError(typeof detail === 'string' ? detail : '保存失败，请重试')
    } finally {
      setProfileSaving(false)
    }
  }

  // 修改密码
  const handleChangePassword = async () => {
    setPwdError('')
    setPwdSuccess('')
    if (!pwdForm.old_password || !pwdForm.new_password) {
      setPwdError('请填写完整')
      return
    }
    if (pwdForm.new_password.length < 6) {
      setPwdError('新密码至少6位')
      return
    }
    try {
      setPwdSaving(true)
      const result = await changePassword(pwdForm)
      setPwdSuccess(result.message || '密码修改成功')
      setPwdForm({ old_password: '', new_password: '' })
      // 弹窗模式下，成功后关闭弹窗（消息留在页面上供查看）
      setShowPwdModal(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setPwdError(typeof detail === 'string' ? detail : '密码修改失败')
    } finally {
      setPwdSaving(false)
    }
  }

  const handleNotifyPrefChange = (key: 'notify_activities' | 'notify_messages') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked
    setNotifyPrefs(prev => ({ ...prev, [key]: val }))
    try {
      await updateNotificationPreferences({ [key]: val })
    } catch (err) {
      console.error(err)
      setNotifyPrefs(prev => ({ ...prev, [key]: !val }))
    }
  }

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
  const currentRole = user?.role || 'user'

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      figure: '手办', mechanical: '机械', architectural: '建筑', art: '艺术', other: '其他',
      tool: '工具', education: '教具',
    }
    return map[cat] || cat
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧用户信息卡片 */}
          <div className="lg:w-72 shrink-0">
            <div className="card-base p-6 sticky top-20">
              {/* 头像 & 角色标识 */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      className="w-20 h-20 rounded-full mx-auto object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                        const parent = (e.target as HTMLImageElement).parentElement
                        if (parent) {
                          parent.classList.add('bg-gradient-brand', 'rounded-full', 'flex', 'items-center', 'justify-center')
                          parent.innerHTML = '<span class="w-10 h-10 text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-10 h-10"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>'
                        }
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-brand rounded-full mx-auto flex items-center justify-center">
                      <User className="w-10 h-10 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-brand-panel text-brand-text-dim border-brand-border">
                    已登录
                  </div>
                </div>
                <h2 className="text-lg font-bold text-brand-text mt-3">{user?.username}</h2>
                <p className="text-sm text-brand-text-dim mt-1">ID: {user?.id}</p>
              </div>

              {/* 统计 */}
              <div className="space-y-2 text-left mb-6">
                <div className="flex justify-between text-sm px-3 py-2 bg-brand-panel rounded-lg">
                  <span className="text-brand-text-dim">我的订单</span>
                  <span className="text-brand-text font-mono">{orders.length}</span>
                </div>
                <div className="flex justify-between text-sm px-3 py-2 bg-brand-panel rounded-lg">
                  <span className="text-brand-text-dim">我的模型</span>
                  <span className="text-brand-text font-mono">{models.length}</span>
                </div>
                <div className="flex justify-between text-sm px-3 py-2 bg-brand-panel rounded-lg">
                  <span className="text-brand-text-dim">我的收藏</span>
                  <span className="text-brand-text font-mono">{favorites.length}</span>
                </div>
              </div>

              <div className="space-y-1">
                {userTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          activeTab === tab.id
                            ? 'bg-brand-orange/10 text-brand-orange'
                            : 'text-brand-text-muted hover:text-brand-text hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                      </button>
                    )
                  })}
                </div>

              <button
                onClick={handleLogout}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm
                         text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1">
            {/* 我的订单 */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="section-title">我的订单</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="card-base p-12 text-center">
                    <Package className="w-12 h-12 text-brand-text-dim mx-auto mb-3" />
                    <p className="text-brand-text-dim">暂无订单</p>
                    <Link to="/" className="text-sm text-brand-blue hover:underline mt-2 inline-block">去浏览模型 →</Link>
                  </div>
                ) : (
                  orders.map((order) => {
                    const statusInfo = orderStatusMap[order.status] || { label: order.status, color: 'text-brand-text-dim bg-white/5' }
                    const config = order.print_config || {}
                    return (
                      <div key={order.id} className="card-base p-5 hover:border-brand-blue/30 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-brand-text-dim">{order.order_no}</span>
                            <span className="text-xs text-brand-text-dim">{order.created_at?.split('T')[0]}</span>
                            {order.model_name && (
                              <span className="text-xs text-brand-text-muted">{order.model_name}</span>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-brand-panel border border-brand-border rounded-xl flex items-center justify-center">
                              <Box className="w-8 h-8 text-brand-text-dim" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-brand-text">
                                订单 #{order.id}
                              </p>
                              <p className="text-xs text-brand-text-dim mt-1">
                                {config.material || 'PLA'} · {config.quantity || 1}件 · {config.color || '白'}
                              </p>
                              <p className="text-xs text-brand-text-dim">
                                {order.recipient_name} · {order.recipient_phone}
                              </p>
                              {order.note && (
                                <p className="text-[10px] text-brand-text-dim mt-0.5">备注: {order.note}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-brand-orange">¥{order.total_price.toFixed(2)}</div>
                            <button
                              onClick={() => handleViewDetail(order.id)}
                              className="mt-1 text-xs text-brand-blue hover:underline inline-flex items-center gap-1"
                            >
                              <Info className="w-3 h-3" />
                              详情
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-brand-border flex gap-3">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => navigate(`/model/${order.model_id}`, {
                                state: { fromOrder: true, orderId: order.id }
                              })}
                              className="px-4 py-1.5 text-xs text-brand-orange bg-brand-orange/10 border border-brand-orange/30 rounded-lg hover:bg-brand-orange/20 flex items-center gap-1"
                            >
                              <Wallet className="w-3 h-3" />
                              去支付
                            </button>
                          )}
                          {(order.status === 'pending' || order.status === 'paid') && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={cancellingId === order.id}
                              className="px-4 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 disabled:opacity-50"
                            >
                              {cancellingId === order.id ? '取消中...' : '取消订单'}
                            </button>
                          )}
                          {order.status === 'shipped' && order.tracking_no && (
                            <span className="px-4 py-1.5 text-xs text-brand-blue border border-brand-blue/30 rounded-lg">
                              物流单号: {order.tracking_no}
                            </span>
                          )}
                          {order.status === 'completed' && (
                            <button
                              onClick={() => navigate(`/model/${order.model_id}`)}
                              className="px-4 py-1.5 text-xs text-brand-text-dim border border-brand-border rounded-lg hover:border-brand-blue hover:text-brand-blue flex items-center gap-1"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              再次购买
                            </button>
                          )}
                          {(order.status === 'completed' || order.status === 'cancelled') && (
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={deletingOrderId === order.id}
                              className="px-4 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              {deletingOrderId === order.id ? '删除中...' : '删除订单'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* 我的收藏 */}
            {activeTab === 'favorites' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="section-title">我的收藏</h2>
                  <div className="flex items-center gap-1 bg-brand-panel border border-brand-border rounded-lg p-0.5">
                    <button
                      onClick={() => {
                        setFavSort('latest')
                        getFavorites(1).then(d => { setFavorites(d.items); setFavTotal(d.total); setFavPage(1) })
                      }}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${favSort === 'latest' ? 'bg-brand-blue text-white' : 'text-brand-text-dim hover:text-brand-text'}`}
                    >最新收藏</button>
                    <button
                      onClick={() => {
                        setFavSort('oldest')
                        getFavorites(1, 'oldest').then(d => { setFavorites(d.items); setFavTotal(d.total); setFavPage(1) })
                      }}
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${favSort === 'oldest' ? 'bg-brand-blue text-white' : 'text-brand-text-dim hover:text-brand-text'}`}
                    >最早收藏</button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="card-base p-12 text-center">
                    <Heart className="w-12 h-12 text-brand-text-dim mx-auto mb-3" />
                    <p className="text-brand-text-dim">暂无收藏</p>
                    <Link to="/models" className="text-sm text-brand-blue hover:underline mt-2 inline-block">
                      去逛逛模型 →
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {favorites.map(fav => (
                        <div key={fav.id} className="card-base p-4 group relative">
                          <Link to={`/model/${fav.model.id}`}>
                            <div className="w-full h-36 bg-brand-panel border border-brand-border rounded-xl overflow-hidden mb-3">
                              {fav.model.image_url ? (
                                <img src={fav.model.image_url} alt={fav.model.name} className="w-full h-full object-cover" />
                              ) : fav.model.glb_path ? (
                                <model-viewer
                                  src={`/${fav.model.glb_path}`}
                                  class="w-full h-full"
                                  auto-rotate
                                  camera-controls={false}
                                  disable-zoom
                                  alt={fav.model.name}
                                  style={{ background: 'transparent' }}
                                ></model-viewer>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Box className="w-10 h-10 text-brand-text-dim" />
                                </div>
                              )}
                            </div>
                            <h3 className="font-medium text-brand-text hover:text-brand-blue text-sm">{fav.model.name}</h3>
                            {fav.model.price && (
                              <p className="text-brand-orange font-bold text-sm mt-1">¥{fav.model.price.toFixed(2)}</p>
                            )}
                            <p className="text-xs text-brand-text-dim mt-1">
                              {new Date(fav.created_at).toLocaleDateString('zh-CN')} 收藏
                            </p>
                          </Link>
                          <button
                            onClick={() => {
                              removeFavorite(fav.model.id).then(() => {
                                setFavorites(prev => prev.filter(f => f.id !== fav.id))
                              }).catch(console.error)
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-black/30 hover:bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            title="取消收藏"
                          >
                            <Heart className="w-4 h-4 text-white fill-current" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* 加载更多 */}
                    {favPage * FAV_PAGE_SIZE < favTotal && (
                      <div className="text-center pt-4">
                        <button
                          onClick={async () => {
                            if (favLoadingMore) return
                            setFavLoadingMore(true)
                            try {
                              const next = favPage + 1
                              const data = await getFavorites(next, favSort === 'oldest' ? 'oldest' : undefined)
                              setFavorites(prev => [...prev, ...data.items])
                              setFavPage(next)
                            } finally {
                              setFavLoadingMore(false)
                            }
                          }}
                          disabled={favLoadingMore}
                          className="px-6 py-2.5 border border-brand-border text-brand-text-dim rounded-lg hover:border-brand-blue hover:text-brand-blue text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          {favLoadingMore ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />加载中...</>
                          ) : (
                            <><Clock className="w-4 h-4" />加载更多（{favorites.length}/{favTotal}）</>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 我的模型 */}
            {activeTab === 'models' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="section-title">我的模型</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-brand-panel border border-brand-border rounded-lg p-0.5">
                      <button
                        onClick={() => {
                          setModelsSort('latest')
                          getMyModels({ page: 1, page_size: MODELS_PAGE_SIZE }).then(d => { setModels(d.items); setModelsTotal(d.total); setModelsPage(1) })
                        }}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${modelsSort === 'latest' ? 'bg-brand-blue text-white' : 'text-brand-text-dim hover:text-brand-text'}`}
                      >最新</button>
                      <button
                        onClick={() => {
                          setModelsSort('oldest')
                          getMyModels({ page: 1, page_size: MODELS_PAGE_SIZE, sort: 'oldest' }).then(d => { setModels(d.items); setModelsTotal(d.total); setModelsPage(1) })
                        }}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${modelsSort === 'oldest' ? 'bg-brand-blue text-white' : 'text-brand-text-dim hover:text-brand-text'}`}
                      >最早</button>
                    </div>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="btn-primary text-sm flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      上传新模型
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
                  </div>
                ) : models.length === 0 ? (
                  <div className="card-base p-12 text-center">
                    <Box className="w-12 h-12 text-brand-text-dim mx-auto mb-3" />
                    <p className="text-brand-text-dim">暂无模型</p>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="text-sm text-brand-blue hover:underline mt-2 inline-block"
                    >
                      上传你的第一个模型 →
                    </button>
                  </div>
                ) : (
                  <>
                    {models.map((model) => {
                      const statusInfo = modelStatusMap[model.status] || { label: model.status, color: 'text-brand-text-dim' }
                      return (
                        <div key={model.id} className="card-base p-5 flex items-center gap-4">
                          <div className="w-20 h-20 bg-brand-panel border border-brand-border rounded-xl flex items-center justify-center">
                            <Box className="w-8 h-8 text-brand-text-dim" />
                          </div>
                          <div className="flex-1">
                            <Link to={`/model/${model.id}`} className="font-medium text-brand-text hover:text-brand-blue">
                              {model.name}
                            </Link>
                            <div className="flex items-center gap-4 mt-1 text-sm text-brand-text-dim">
                              <span>{getCategoryLabel(model.category)}</span>
                              <span>{formatFileSize(model.file_size)}</span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> {model.view_count}
                              </span>
                            </div>
                            <div className="text-xs text-brand-text-dim mt-1">
                              上传于 {model.created_at?.split('T')[0]}
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                          <div className="flex gap-2">
                            {model.status === 'approved' && (
                              <Link
                                to={`/model/${model.id}`}
                                className="btn-secondary text-sm"
                              >
                                查看
                              </Link>
                            )}
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              删除
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {/* 加载更多 */}
                    {modelsPage * MODELS_PAGE_SIZE < modelsTotal && (
                      <div className="text-center pt-4">
                        <button
                          onClick={async () => {
                            if (modelsLoadingMore) return
                            setModelsLoadingMore(true)
                            try {
                              const next = modelsPage + 1
                              const data = await getMyModels({ page: next, page_size: MODELS_PAGE_SIZE, sort: modelsSort === 'oldest' ? 'oldest' : undefined })
                              setModels(prev => [...prev, ...data.items])
                              setModelsPage(next)
                            } finally {
                              setModelsLoadingMore(false)
                            }
                          }}
                          disabled={modelsLoadingMore}
                          className="px-6 py-2.5 border border-brand-border text-brand-text-dim rounded-lg hover:border-brand-blue hover:text-brand-blue text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          {modelsLoadingMore ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />加载中...</>
                          ) : (
                            <><Clock className="w-4 h-4" />加载更多（{models.length}/{modelsTotal}）</>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 收货地址 */}
            {activeTab === 'address' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="section-title">收货地址</h2>
                  <button
                    onClick={handleAddAddress}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    新增地址
                  </button>
                </div>

                {/* 地址表单 */}
                {showAddressForm && (
                  <div className="card-base p-5 border border-brand-orange/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-medium text-brand-text">
                        {editingAddress ? '编辑地址' : '新增地址'}
                      </h3>
                      <button
                        onClick={() => setShowAddressForm(false)}
                        className="text-brand-text-dim hover:text-brand-text"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-brand-text-dim block mb-1.5">收货人姓名</label>
                        <input
                          type="text"
                          value={addressForm.recipient_name}
                          onChange={e => setAddressForm({...addressForm, recipient_name: e.target.value})}
                          placeholder="请输入姓名"
                          className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder-brand-text-dim/50 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-brand-text-dim block mb-1.5">手机号</label>
                        <input
                          type="tel"
                          value={addressForm.recipient_phone}
                          onChange={e => setAddressForm({...addressForm, recipient_phone: e.target.value})}
                          placeholder="请输入手机号"
                          className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder-brand-text-dim/50 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-brand-text-dim block mb-1.5">省</label>
                        <input
                          type="text"
                          value={addressForm.province}
                          onChange={e => setAddressForm({...addressForm, province: e.target.value})}
                          placeholder="如：广东省"
                          className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder-brand-text-dim/50 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-brand-text-dim block mb-1.5">市</label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                          placeholder="如：深圳市"
                          className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder-brand-text-dim/50 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-brand-text-dim block mb-1.5">区/县</label>
                        <input
                          type="text"
                          value={addressForm.district}
                          onChange={e => setAddressForm({...addressForm, district: e.target.value})}
                          placeholder="如：南山区"
                          className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder-brand-text-dim/50 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-brand-text-dim block mb-1.5">详细地址</label>
                        <input
                          type="text"
                          value={addressForm.detail_address}
                          onChange={e => setAddressForm({...addressForm, detail_address: e.target.value})}
                          placeholder="街道、门牌号等"
                          className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text placeholder-brand-text-dim/50 focus:outline-none focus:border-brand-blue"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <label className="flex items-center gap-2 text-sm text-brand-text-dim cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addressForm.is_default || false}
                          onChange={e => setAddressForm({...addressForm, is_default: e.target.checked})}
                          className="w-4 h-4 rounded border-brand-border bg-brand-panel text-brand-orange focus:ring-brand-orange"
                        />
                        设为默认地址
                      </label>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={handleSaveAddress}
                        disabled={addressSaving}
                        className="btn-primary text-sm flex items-center gap-2"
                      >
                        {addressSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {addressSaving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => setShowAddressForm(false)}
                        className="btn-secondary text-sm"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {/* 地址列表 */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="card-base p-12 text-center">
                    <MapPin className="w-12 h-12 text-brand-text-dim mx-auto mb-3" />
                    <p className="text-brand-text-dim">暂无收货地址</p>
                    <p className="text-brand-text-dim text-xs mt-1">点击上方按钮添加地址</p>
                  </div>
                ) : (
                  addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`card-base p-5 ${addr.is_default ? 'border-brand-orange/40' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-base font-medium text-brand-text">{addr.recipient_name}</span>
                            <span className="text-sm text-brand-text-muted">{addr.recipient_phone}</span>
                            {addr.is_default && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-brand-orange/10 text-brand-orange border border-brand-orange/30 flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                默认
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-brand-text-muted">
                            {addr.province}{addr.city}{addr.district}{addr.detail_address}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {!addr.is_default && (
                            <button
                              onClick={() => handleSetDefault(addr.id)}
                              className="px-3 py-1.5 text-xs text-brand-orange border border-brand-orange/30 rounded-lg hover:bg-brand-orange/10"
                            >
                              设为默认
                            </button>
                          )}
                          <button
                            onClick={() => handleEditAddress(addr)}
                            className="p-1.5 text-brand-text-dim hover:text-brand-blue rounded-lg hover:bg-brand-blue/10"
                            title="编辑"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-brand-text-dim hover:text-red-400 rounded-lg hover:bg-red-400/10"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 我的账户 */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <h2 className="section-title">我的账户</h2>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
                  </div>
                ) : walletData ? (
                  <>
                    {/* 资产卡片 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 余额卡片 */}
                      <div className="card-base p-6 bg-gradient-to-br from-brand-orange/10 to-transparent border-brand-orange/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-brand-orange/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-brand-orange" />
                          </div>
                          <div>
                            <p className="text-xs text-brand-text-dim">账户余额</p>
                            <p className="text-2xl font-bold text-brand-orange">¥{walletData.balance.toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-brand-text-dim">可用于下单支付，支持扫码充值</p>
                      </div>

                      {/* Nova豆卡片 */}
                      <div className="card-base p-6 bg-gradient-to-br from-brand-blue/10 to-transparent border-brand-blue/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center">
                            <Coins className="w-5 h-5 text-brand-blue" />
                          </div>
                          <div>
                            <p className="text-xs text-brand-text-dim">Nova豆</p>
                            <p className="text-2xl font-bold text-brand-blue">{walletData.nova_coins}</p>
                          </div>
                        </div>
                        <p className="text-xs text-brand-text-dim">每1个抵扣订单0.5%，最多抵扣50%</p>
                      </div>
                    </div>

                    {/* 充值面板 */}
                    <div className="card-base p-6">
                      <h3 className="text-base font-medium text-brand-text mb-4">余额充值</h3>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {[50, 100, 200, 500, 1000].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setRechargeAmount(amount)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                              rechargeAmount === amount
                                ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                                : 'border-brand-border text-brand-text-dim hover:border-brand-blue hover:text-brand-text'
                            }`}
                          >
                            ¥{amount}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xs">
                          <label className="text-xs text-brand-text-dim block mb-1.5">自定义金额</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim">¥</span>
                            <input
                              type="number"
                              value={rechargeAmount}
                              onChange={e => setRechargeAmount(Number(e.target.value) || 0)}
                              min={1}
                              className="w-full pl-8 pr-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-blue"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleRecharge}
                          disabled={recharging || rechargeAmount <= 0}
                          className="btn-primary mt-5 flex items-center gap-2"
                        >
                          {recharging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          {recharging ? '充值中...' : '立即充值'}
                        </button>
                      </div>
                      <p className="text-xs text-brand-text-dim mt-3">
                        💡 演示充值直接到账，生成环境将跳转至支付页面
                      </p>
                    </div>

                    {/* Nova豆获取说明 */}
                    <div className="card-base p-6">
                      <h3 className="text-base font-medium text-brand-text mb-3">Nova豆获取方式</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Upload className="w-3.5 h-3.5 text-brand-blue" />
                          </div>
                          <div>
                            <p className="text-sm text-brand-text">上传模型并审核通过</p>
                            <p className="text-xs text-brand-text-dim">每个审核通过的模型奖励 <span className="text-brand-blue font-semibold">2</span> 个Nova豆</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertCircle className="w-3.5 h-3.5 text-brand-blue" />
                          </div>
                          <div>
                            <p className="text-sm text-brand-text">完成公告任务</p>
                            <p className="text-xs text-brand-text-dim">关注公告活动，参与社区任务赢取额外Nova豆</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card-base p-12 text-center">
                    <Wallet className="w-12 h-12 text-brand-text-dim mx-auto mb-3" />
                    <p className="text-brand-text-dim">加载失败</p>
                  </div>
                )}
              </div>
            )}

            {/* 个人设置 */}
            {activeTab === 'profile' && (
              <div className="card-base p-5">
                <h2 className="section-title mb-6">个人设置</h2>
                <div className="space-y-6">
                  {/* 头像 */}
                  <div className="flex items-center justify-between p-4 bg-brand-panel rounded-xl">
                    <div className="flex items-center gap-4">
                      {/* 头像展示 + 点击上传 */}
                      <div
                        className="relative w-14 h-14 rounded-full overflow-hidden cursor-pointer group"
                        onClick={handleAvatarClick}
                      >
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt="头像"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                              // 显示首字母
                              const parent = (e.target as HTMLImageElement).parentElement
                              if (parent) {
                                parent.classList.add('bg-gradient-brand', 'flex', 'items-center', 'justify-center')
                                const span = document.createElement('span')
                                span.className = 'text-white text-lg font-bold'
                                span.textContent = user?.username?.[0]?.toUpperCase() || 'U'
                                parent.appendChild(span)
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-brand flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              {user?.username?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        {/* 悬停遮罩 */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {avatarUploading ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-text">头像</p>
                        <p className="text-xs text-brand-text-dim">点击头像可更换</p>
                      </div>
                    </div>
                    {/* 隐藏的文件选择器 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-brand-text-dim block mb-2">用户名</label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={e => setProfileForm(p => ({ ...p, username: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                                 text-sm text-brand-text focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-brand-text-dim block mb-2">手机号</label>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-brand-text">{user?.phone || '未绑定'}</span>
                        <button onClick={() => setShowPhoneModal(true)} className="btn-secondary text-xs px-3 py-1.5">
                          更改手机号
                        </button>
                      </div>
                    </div>
                  </div>

                  {profileError && (
                    <div className="px-4 py-2.5 bg-red-400/10 border border-red-400/30 rounded-lg text-sm text-red-400">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/30 rounded-lg text-sm text-emerald-400">
                      {profileSuccess}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleSaveProfile} disabled={profileSaving} className="btn-primary">
                      {profileSaving ? '保存中...' : '保存资料'}
                    </button>
                  </div>
                </div>

                {/* 修改密码 */}
                <div className="mt-8 pt-6 border-t border-brand-border/50">
                  <h3 className="text-sm font-semibold text-brand-text mb-4">修改密码</h3>
                  <p className="text-sm text-brand-text-dim mb-4">定期更换密码有助于保护账户安全</p>
                  {pwdError && (
                    <div className="mb-4 px-4 py-2.5 bg-red-400/10 border border-red-400/30 rounded-lg text-sm text-red-400 max-w-md">
                      {pwdError}
                    </div>
                  )}
                  {pwdSuccess && (
                    <div className="mb-4 px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/30 rounded-lg text-sm text-emerald-400 max-w-md">
                      {pwdSuccess}
                    </div>
                  )}
                  <button onClick={() => setShowPwdModal(true)} className="btn-secondary">
                    修改密码
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 修改密码弹窗 */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPwdModal(false)}>
          <div className="card-base w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-brand-text">修改密码</h3>
              <button onClick={() => setShowPwdModal(false)} className="text-brand-text-dim hover:text-brand-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-brand-text-dim block mb-2">原密码</label>
                <input
                  type="password"
                  value={pwdForm.old_password}
                  onChange={e => setPwdForm(p => ({ ...p, old_password: e.target.value }))}
                  placeholder="输入原密码"
                  className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                           text-sm text-brand-text focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="text-sm text-brand-text-dim block mb-2">新密码</label>
                <input
                  type="password"
                  value={pwdForm.new_password}
                  onChange={e => setPwdForm(p => ({ ...p, new_password: e.target.value }))}
                  placeholder="至少6位字符"
                  className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                           text-sm text-brand-text focus:outline-none focus:border-brand-blue"
                />
              </div>
              {pwdError && (
                <div className="px-4 py-2.5 bg-red-400/10 border border-red-400/30 rounded-lg text-sm text-red-400">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/30 rounded-lg text-sm text-emerald-400">
                  {pwdSuccess}
                </div>
              )}
              <button onClick={handleChangePassword} disabled={pwdSaving} className="btn-primary w-full">
                {pwdSaving ? (
                  <><Loader2 size={16} className="animate-spin mr-2 inline" />修改中...</>
                ) : '确认修改'}
              </button>
            </div>

            {/* 通知偏好设置 */}
            <div className="mt-8 pt-6 border-t border-brand-border/50">
              <h3 className="text-sm font-semibold text-brand-text mb-4">通知偏好</h3>
              <p className="text-sm text-brand-text-dim mb-4">管理您希望接收的通知类型</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-brand-panel rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-brand-text">关注者动态</p>
                    <p className="text-xs text-brand-text-dim mt-0.5">当您关注的人发布新帖子或新模型时接收通知</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyPrefs.notify_activities}
                      onChange={handleNotifyPrefChange('notify_activities')}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-brand-border rounded-full peer peer-checked:bg-brand-blue
                                 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                                 after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-full">
                    </div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-brand-panel rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-brand-text">私信通知</p>
                    <p className="text-xs text-brand-text-dim mt-0.5">当有人向您发送私信时接收通知</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyPrefs.notify_messages}
                      onChange={handleNotifyPrefChange('notify_messages')}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-brand-border rounded-full peer peer-checked:bg-brand-blue
                                 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
                                 after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-full">
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 更改手机号弹窗 */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { setShowPhoneModal(false); setPhoneForm({ phone: '', phone_code: '' }); setPhoneCodeCountdown(0) }}>
          <div className="card-base w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-brand-text">更改手机号</h3>
              <button onClick={() => { setShowPhoneModal(false); setPhoneForm({ phone: '', phone_code: '' }); setPhoneCodeCountdown(0) }} className="text-brand-text-dim hover:text-brand-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-brand-text-dim">当前手机号：{user?.phone || '未绑定'}</p>
              <div>
                <label className="text-sm text-brand-text-dim block mb-2">新手机号</label>
                <input
                  type="tel"
                  value={phoneForm.phone}
                  onChange={e => setPhoneForm(p => ({ ...p, phone: e.target.value }))}
                  maxLength={11}
                  placeholder="请输入11位手机号"
                  className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                           text-sm text-brand-text placeholder:text-brand-text-dim
                           focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="text-sm text-brand-text-dim block mb-2">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={phoneForm.phone_code}
                    onChange={e => setPhoneForm(p => ({ ...p, phone_code: e.target.value }))}
                    maxLength={6}
                    placeholder="请输入验证码"
                    className="flex-1 px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                             text-sm text-brand-text placeholder:text-brand-text-dim
                             focus:outline-none focus:border-brand-blue"
                  />
                  <button
                    onClick={handleSendPhoneCode}
                    disabled={phoneCodeSending || phoneCodeCountdown > 0 || !phoneForm.phone || phoneForm.phone.length !== 11}
                    className="px-4 py-2.5 bg-brand-blue/20 text-brand-blue rounded-lg text-sm
                             whitespace-nowrap hover:bg-brand-blue/30 transition-colors disabled:opacity-50"
                  >
                    {phoneCodeCountdown > 0 ? `${phoneCodeCountdown}s` : phoneCodeSending ? '发送中...' : '获取验证码'}
                  </button>
                </div>
              </div>
              <button onClick={handleChangePhone} className="btn-primary w-full">
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 上传弹窗 */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* 订单详情弹窗 */}
      {detailOrder && (() => {
        const o = detailOrder
        const config = o.print_config || {}
        const statusInfo = orderStatusMap[o.status] || { label: o.status, color: 'text-brand-text-dim bg-white/5' }
        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetailOrder(null)}>
            <div className="card-base max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-brand-text">订单详情</h3>
                <button onClick={() => setDetailOrder(null)} className="text-brand-text-dim hover:text-brand-text">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">订单编号</span>
                  <span className="text-brand-text font-mono">{o.order_no}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">模型名称</span>
                  <span className="text-brand-text">{o.model_name || '未知'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">状态</span>
                  <span className={`px-2 py-0.5 text-xs rounded-lg ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">材质</span>
                  <span className="text-brand-text">{config.material || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">颜色</span>
                  <span className="text-brand-text">{config.color || '白'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">数量</span>
                  <span className="text-brand-text">{config.quantity || 1} 件</span>
                </div>
                {o.model_id && (
                  <div className="flex justify-between py-2 border-b border-brand-border/50">
                    <span className="text-brand-text-dim">操作</span>
                    <Link to={`/model/${o.model_id}`} className="text-brand-blue hover:underline">查看模型</Link>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">收件人</span>
                  <span className="text-brand-text">{o.recipient_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">联系电话</span>
                  <span className="text-brand-text">{o.recipient_phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">收货地址</span>
                  <span className="text-brand-text text-right max-w-[250px]">{o.shipping_address}</span>
                </div>
                {o.note && (
                  <div className="flex justify-between py-2 border-b border-brand-border/50">
                    <span className="text-brand-text-dim">备注</span>
                    <span className="text-brand-text text-right max-w-[250px]">{o.note}</span>
                  </div>
                )}
                {o.tracking_no && (
                  <div className="flex justify-between py-2 border-b border-brand-border/50">
                    <span className="text-brand-text-dim">物流单号</span>
                    <span className="text-brand-text font-mono">{o.tracking_no}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-brand-border/50">
                  <span className="text-brand-text-dim">下单时间</span>
                  <span className="text-brand-text">{o.created_at ? new Date(o.created_at).toLocaleString('zh-CN') : '-'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-brand-text font-semibold">订单金额</span>
                  <span className="text-lg font-bold text-brand-orange">¥{o.total_price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}