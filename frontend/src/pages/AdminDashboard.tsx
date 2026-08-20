import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Package, Box, Users, TrendingUp, Clock,
  AlertCircle, CheckCircle, Eye, XCircle, Truck, Loader2, ArrowLeft, Upload, Trash2, Shield, Star, RefreshCw,
  MessageSquare, Megaphone, Plus, Save, Edit3, X, Send, UserCog, UserPlus as UserPlusIcon, UserMinus, Crown,
  Wrench, HelpCircle
} from 'lucide-react'
import { getAllOrders, updateOrderStatus, OrderResponse } from '../api/orders'
import { getAllModels, updateModelStatus, deleteModel, ModelResponse } from '../api/models'
import { getAllModelComments, deleteModelComment, ModelComment } from '../api/modelComments'
import { getAllDiscussions, getAllReplies, deleteDiscussion, deleteReply, updateDiscussion, DiscussionResponse, ReplyResponse, categoryNames } from '../api/discussions'
import { getReports, handleReport, ReportResponse, reportReasons } from '../api/reports'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, Announcement as AnnouncementRes } from '../api/announcements'
import { getAllUsers, setUserRole, UserItem } from '../api/auth'
import UploadModal from '../components/UploadModal'
import { getAllMaterials, updateMaterial, createMaterial, deleteMaterial, MaterialData } from '../api/materials'
import { getAllHelpArticles, createHelpArticle, updateHelpArticle, deleteHelpArticle, HelpArticleData } from '../api/help'
import { Pagination } from '../components/Pagination'

const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'text-brand-orange bg-brand-orange/10' },
  paid: { label: '已付款', color: 'text-brand-blue bg-brand-blue/10' },
  printing: { label: '生产中', color: 'text-brand-blue bg-brand-blue/10' },
  shipped: { label: '已发货', color: 'text-emerald-400 bg-emerald-400/10' },
  completed: { label: '已完成', color: 'text-brand-text-dim bg-white/5' },
  cancelled: { label: '已取消', color: 'text-red-400 bg-red-400/10' },
}

const modelStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'text-brand-orange bg-brand-orange/10' },
  approved: { label: '已通过', color: 'text-emerald-400 bg-emerald-400/10' },
  rejected: { label: '已拒绝', color: 'text-red-400 bg-red-400/10' },
}

export default function AdminDashboard() {
  const { isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  const sidebarItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'orders', label: '订单管理', icon: Package },
    { id: 'models', label: '模型管理', icon: Box },
    { id: 'materials', label: '材料管理', icon: Wrench },
    { id: 'help', label: '帮助管理', icon: HelpCircle },
    { id: 'comments', label: '评论管理', icon: MessageSquare },
    { id: 'discussions', label: '帖子管理', icon: MessageSquare },
    { id: 'replies', label: '回帖管理', icon: MessageSquare },
    { id: 'reports', label: '举报管理', icon: AlertCircle },
    { id: 'announcements', label: '公告管理', icon: Megaphone },
    ...(isSuperAdmin ? [{ id: 'users', label: '用户管理', icon: Users }] : []),
  ]
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersSearch, setOrdersSearch] = useState('')
  const ORDERS_PAGE_SIZE = 15
  const [models, setModels] = useState<ModelResponse[]>([])
  const [modelsPage, setModelsPage] = useState(1)
  const [modelsTotal, setModelsTotal] = useState(0)
  const [modelsSearch, setModelsSearch] = useState('')
  const MODELS_PAGE_SIZE = 15
  const [loading, setLoading] = useState(false)
  const [orderFilter, setOrderFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [comments, setComments] = useState<ModelComment[]>([])
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsSearch, setCommentsSearch] = useState('')
  const COMMENTS_PAGE_SIZE = 15
  const DISCUSSIONS_PAGE_SIZE = 15
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)
  const [discussions, setDiscussions] = useState<DiscussionResponse[]>([])
  const [discussionsTotal, setDiscussionsTotal] = useState(0)
  const [discussionsSearch, setDiscussionsSearch] = useState('')
  const [discussionsPage, setDiscussionsPage] = useState(1)
  const [replies, setReplies] = useState<ReplyResponse[]>([])
  const [repliesTotal, setRepliesTotal] = useState(0)
  const [repliesSearch, setRepliesSearch] = useState('')
  const [repliesPage, setRepliesPage] = useState(1)
  const [deletingDiscussionId, setDeletingDiscussionId] = useState<number | null>(null)
  const [deletingReplyId, setDeletingReplyId] = useState<number | null>(null)

  // 发货弹窗
  const [shipModal, setShipModal] = useState<{ open: boolean; orderId: number }>({ open: false, orderId: 0 })
  const [trackingNo, setTrackingNo] = useState('')
  const [shipping, setShipping] = useState(false)
  const [shipError, setShipError] = useState('')

  // 公告管理
  const [announcements, setAnnouncements] = useState<AnnouncementRes[]>([])
  const [announcementsTotal, setAnnouncementsTotal] = useState(0)
  const [announcePage, setAnnouncePage] = useState(1)
  const [announceSearch, setAnnounceSearch] = useState('')
  const ANNOUNCE_PAGE_SIZE = 10
  const [reports, setReports] = useState<ReportResponse[]>([])
  const [handlingReportId, setHandlingReportId] = useState<number | null>(null)
  const [reportFilter, setReportFilter] = useState<'all' | 'pending'>('pending')
  const [announceEdit, setAnnounceEdit] = useState<AnnouncementRes | null>(null)
  const [announceForm, setAnnounceForm] = useState({ title: '', summary: '', content: '', cover_url: '' })

  // 材料管理
  const [materials, setMaterials] = useState<MaterialData[]>([])
  const [helpArticles, setHelpArticles] = useState<HelpArticleData[]>([])
  const [materialForm, setMaterialForm] = useState({ name_zh: '', name_en: '', price_per_gram: 0, density: 1.25, is_active: true, sort_order: 0 })
  const [materialEdit, setMaterialEdit] = useState<MaterialData | null>(null)
  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [materialSaving, setMaterialSaving] = useState(false)
  const [helpForm, setHelpForm] = useState({ section: '', title: '', content: '', sort_order: 0 })
  const [helpEdit, setHelpEdit] = useState<HelpArticleData | null>(null)
  const [showHelpForm, setShowHelpForm] = useState(false)
  const [helpSaving, setHelpSaving] = useState(false)


  // 用户管理（超级管理员）
  const [allUsers, setAllUsers] = useState<UserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [settingRole, setSettingRole] = useState<number | null>(null)

  // ====== 带搜索分页的加载函数（各 Tab 复用） ======
  const loadOrders = async (pageNum = 1, keepExisting = false) => {
    const data = await getAllOrders({ status: orderFilter || undefined, search: ordersSearch || undefined, page: pageNum, page_size: ORDERS_PAGE_SIZE })
    setOrders(keepExisting ? prev => [...prev, ...data.items] : data.items)
    setOrdersTotal(data.total)
    setOrdersPage(pageNum)
  }
  const loadModels = async (pageNum = 1, keepExisting = false) => {
    const data = await getAllModels({ status: modelFilter || undefined, search: modelsSearch || undefined, page: pageNum, page_size: MODELS_PAGE_SIZE })
    if (keepExisting) {
      setModels(prev => [...prev, ...data.items])
    } else {
      setModels(data.items)
    }
    setModelsTotal(data.total)
    setModelsPage(pageNum)
  }
  const loadComments = async (pageNum = 1, keepExisting = false) => {
    const data = await getAllModelComments({ search: commentsSearch || undefined, page: pageNum, page_size: COMMENTS_PAGE_SIZE })
    setComments(data.items)
    setCommentsTotal(data.total)
    setCommentsPage(pageNum)
  }
  const loadReplies = async (pageNum = 1) => {
    const data = await getAllReplies({ search: repliesSearch || undefined, page: pageNum, page_size: 15 })
    setReplies(data.items)
    setRepliesTotal(data.total)
    setRepliesPage(pageNum)
  }
  const loadDiscussions = async (pageNum = 1) => {
    const data = await getAllDiscussions({ search: discussionsSearch || undefined, page: pageNum, page_size: DISCUSSIONS_PAGE_SIZE })
    setDiscussions(data.items)
    setDiscussionsTotal(data.total)
    setDiscussionsPage(pageNum)
  }
  const loadAnnouncements = async (pageNum = 1) => {
    const data = await getAnnouncements({ search: announceSearch || undefined, page: pageNum, page_size: ANNOUNCE_PAGE_SIZE })
    setAnnouncements(data.items)
    setAnnouncementsTotal(data.total)
    setAnnouncePage(pageNum)
  }
  const loadReports = async () => {
    const data = await getReports({ page_size: 200 })
    setReports(data.items)
  }

  const loadMaterials = async () => {
    const data = await getAllMaterials()
    setMaterials(data.items)
  }
  const loadHelpArticles = async () => {
    const data = await getAllHelpArticles()
    setHelpArticles(data)
  }

  // 初始数据加载（切换 Tab 时）
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (activeTab === 'dashboard' || activeTab === 'orders') await loadOrders()
        if (activeTab === 'dashboard' || activeTab === 'models') await loadModels()
        if (activeTab === 'dashboard' || activeTab === 'comments') await loadComments()
        if (activeTab === 'dashboard' || activeTab === 'announcements') await loadAnnouncements()
        if (activeTab === 'dashboard' || activeTab === 'discussions') {
          const data = await getAllDiscussions({ page_size: 100 })
          setDiscussions(data.items)
        }
        if (activeTab === 'dashboard' || activeTab === 'replies') {
          await loadReplies()
        }
        if ((activeTab === 'dashboard' || activeTab === 'users') && isSuperAdmin) {
          const data = await getAllUsers()
          setAllUsers(data)
        }
        if (activeTab === 'dashboard' || activeTab === 'reports') await loadReports()
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeTab])

  // 删除模型
  const handleDeleteModel = async (id: number, name: string) => {
    if (!confirm(`确定要删除模型「${name}」吗？\n\n如果有订单关联此模型，订单数据会保留但不再关联该模型。此操作不可恢复！`)) return
    try {
      setDeletingId(id)
      await deleteModel(id)
      setModels(models.filter(m => m.id !== id))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        alert(`删除失败：${detail}`)
      } else {
        alert('删除失败，请稍后重试')
      }
    } finally {
      setDeletingId(null)
    }
  }

  // 审核模型
  const handleModelStatus = async (id: number, status: string) => {
    try {
      await updateModelStatus(id, status)
      setModels(models.map(m => m.id === id ? { ...m, status } : m))
    } catch (err) {
      console.error('Update failed:', err)
    }
  }

  // 更新订单状态
  const handleOrderStatus = async (id: number, status: string) => {
    try {
      await updateOrderStatus(id, status)
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o))
    } catch (err) {
      console.error('Update failed:', err)
    }
  }

  // 上传成功后刷新模型
  const handleUploadSuccess = async () => {
    await loadModels()
  }


  // 材料 CRUD
  const openMaterialForm = (mat?: MaterialData) => {
    if (mat) {
      setMaterialForm({ name_zh: mat.name_zh, name_en: mat.name_en, price_per_gram: mat.price_per_gram, density: mat.density, is_active: mat.is_active, sort_order: mat.sort_order || 0 })
      setMaterialEdit(mat)
    } else {
      setMaterialForm({ name_zh: '', name_en: '', price_per_gram: 0, density: 1.25, is_active: true, sort_order: 0 })
      setMaterialEdit(null)
    }
    setShowMaterialForm(true)
  }
  const saveMaterial = async () => {
    if (!materialForm.name_zh.trim()) { alert('请输入材料名称'); return }
    setMaterialSaving(true)
    try {
      if (materialEdit) { await updateMaterial(materialEdit.id, materialForm) }
      else { await createMaterial(materialForm) }
      setShowMaterialForm(false)
      await loadMaterials()
    } catch (e: any) { alert(typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : '保存失败') }
    finally { setMaterialSaving(false) }
  }
  const deleteMaterialHandler = async (id: number, name: string) => {
    if (!confirm('确定删除材料「' + name + '」？')) return
    try { await deleteMaterial(id); await loadMaterials() }
    catch (e: any) { alert('删除失败') }
  }
  // 帮助文章 CRUD
  const openHelpForm = (article?: HelpArticleData) => {
    if (article) {
      setHelpForm({ section: article.section, title: article.title, content: article.content || '', sort_order: article.sort_order || 0 })
      setHelpEdit(article)
    } else {
      setHelpForm({ section: '', title: '', content: '', sort_order: 0 })
      setHelpEdit(null)
    }
    setShowHelpForm(true)
  }
  const saveHelpArticle = async () => {
    if (!helpForm.title.trim()) { alert('请输入标题'); return }
    if (!helpForm.section.trim()) { alert('请输入分区'); return }
    setHelpSaving(true)
    try {
      if (helpEdit) { await updateHelpArticle(helpEdit.id, helpForm) }
      else { await createHelpArticle(helpForm) }
      setShowHelpForm(false)
      await loadHelpArticles()
    } catch (e: any) { alert(typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : '保存失败') }
    finally { setHelpSaving(false) }
  }
  const deleteHelpHandler = async (id: number, title: string) => {
    if (!confirm('确定删除文章「' + title + '」？')) return
    try { await deleteHelpArticle(id); await loadHelpArticles() }
    catch (e: any) { alert('删除失败') }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid')
  const pendingModels = models.filter(m => m.status === 'pending')
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_price, 0)

  return (
﻿<div className="flex min-h-screen bg-brand-dark">
      {/* 左侧导航 */}
      <aside className="w-64 bg-brand-panel border-r border-brand-border shrink-0">
        <div className="sticky top-0 h-screen flex flex-col">
          <div className="p-5 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-brand rounded-lg flex items-center justify-center">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-brand-text">3D<span className="text-brand-orange">Print</span></span>
                <span className="block text-xs text-brand-text-dim font-mono -mt-0.5">ADMIN</span>
              </div>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={async () => {
                  const prevTab = activeTab
                  setActiveTab(item.id)
                  if (item.id !== prevTab) {
                    try {
                      if (item.id === 'orders' || item.id === 'dashboard') await loadOrders()
                      if (item.id === 'models' || item.id === 'dashboard') await loadModels()
                      if (item.id === 'comments' || item.id === 'dashboard') await loadComments()
                      if (item.id === 'discussions' || item.id === 'dashboard') await loadDiscussions()
                      if (item.id === 'replies' || item.id === 'dashboard') await loadReplies()
                      if (item.id === 'announcements' || item.id === 'dashboard') await loadAnnouncements()
                      if (item.id === 'reports' || item.id === 'dashboard') await loadReports()
                      if (item.id === 'materials' || item.id === 'dashboard') await loadMaterials()
                      if (item.id === 'help' || item.id === 'dashboard') await loadHelpArticles()
                    } catch (e) { console.error('Tab switch load error:', e) }
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === item.id
                    ? 'bg-brand-orange/15 text-brand-orange font-medium'
                    : 'text-brand-text-dim hover:bg-brand-panel/50 hover:text-brand-text'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="pt-4 border-t border-brand-border mt-4">
              <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-text-dim hover:text-brand-text hover:bg-brand-panel/50 transition-all">
                <ArrowLeft className="w-4 h-4" />
                <span>返回前台</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
          </div>
        ) : (
          <>
            {/* 仪表盘 */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card-base p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-orange/15 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-brand-orange" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-brand-text">{orders.length}</p>
                        <p className="text-xs text-brand-text-dim">订单总数</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-base p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-blue/15 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-brand-text">{models.length}</p>
                        <p className="text-xs text-brand-text-dim">模型总数</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-base p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-400/15 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-brand-text">{orders.filter(o => o.status === 'pending').length}</p>
                        <p className="text-xs text-brand-text-dim">待处理订单</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-base p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-400/15 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-brand-text">{models.filter(m => m.status === 'pending').length}</p>
                        <p className="text-xs text-brand-text-dim">待审核模型</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-base p-5">
                  <h2 className="font-semibold text-sm text-brand-text mb-4">待处理订单</h2>
                  {orders.filter(o => o.status === 'paid' || o.status === 'printing').length === 0 ? (
                    <div className="text-center py-8 text-brand-text-dim text-sm">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>暂无待处理订单</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-brand-text-dim border-b border-brand-border">
                            <th className="pb-3 font-medium">订单号</th>
                            <th className="pb-3 font-medium">模型</th>
                            <th className="pb-3 font-medium">金额</th>
                            <th className="pb-3 font-medium">状态</th>
                            <th className="pb-3 font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.filter(o => o.status === 'paid' || o.status === 'printing').slice(0, 10).map(o => (
                            <tr key={o.id} className="border-b border-brand-border/50">
                              <td className="py-3 text-xs font-mono text-brand-text-dim">{o.order_no}</td>
                              <td className="py-3 text-sm text-brand-text">{o.model_name || '-'}</td>
                              <td className="py-3 text-sm text-brand-text">¥{o.total_price.toFixed(2)}</td>
                              <td className="py-3">
                                <span className={`px-2.5 py-1 text-xs rounded-full ${orderStatusMap[o.status]?.color || ''}`}>{orderStatusMap[o.status]?.label || o.status}</span>
                              </td>
                              <td className="py-3">
                                <button onClick={() => { setShipModal({ open: true, orderId: o.id }); setTrackingNo(''); setShipError('') }}
                                  className="px-3 py-1.5 text-xs bg-brand-orange/10 text-brand-orange rounded-lg hover:bg-brand-orange/20">发货</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="card-base p-5">
                  <h2 className="font-semibold text-sm text-brand-text mb-4">待审核模型</h2>
                  {models.filter(m => m.status === 'pending').length === 0 ? (
                    <div className="text-center py-8 text-brand-text-dim text-sm">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>暂无待审核模型</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-brand-text-dim border-b border-brand-border">
                            <th className="pb-3 font-medium">模型名</th>
                            <th className="pb-3 font-medium">上传者</th>
                            <th className="pb-3 font-medium">状态</th>
                            <th className="pb-3 font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {models.filter(m => m.status === 'pending').slice(0, 10).map(m => (
                            <tr key={m.id} className="border-b border-brand-border/50">
                              <td className="py-3 text-sm text-brand-text">{m.name}</td>
                              <td className="py-3 text-xs text-brand-text-dim">{m.uploader_id || '-'}</td>
                              <td className="py-3"><span className="px-2.5 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">待审核</span></td>
                              <td className="py-3">
                                <div className="flex gap-2">
                                  <button onClick={() => updateModelStatus(m.id, 'approved').then(() => loadModels())} className="px-3 py-1.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-lg hover:bg-emerald-400/20">通过</button>
                                  <button onClick={() => updateModelStatus(m.id, 'rejected').then(() => loadModels())} className="px-3 py-1.5 text-xs bg-red-400/10 text-red-400 rounded-lg hover:bg-red-400/20">拒绝</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 订单管理 */}
            {activeTab === 'orders' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">订单管理</h2>
                  <span className="text-xs text-brand-text-dim">共 {ordersTotal} 条</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <input type="text" value={ordersSearch} onChange={e => setOrdersSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadOrders() }}
                    placeholder="搜索订单号、模型名..." className="w-full sm:w-64 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                  {['', 'pending', 'paid', 'printing', 'shipped', 'completed', 'cancelled'].map(s => (
                    <button key={s} onClick={() => { setOrderFilter(s); loadOrders() }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${orderFilter === s ? 'bg-brand-orange/15 text-brand-orange' : 'text-brand-text-dim bg-brand-panel hover:bg-brand-panel/70'}`}>
                      {orderStatusMap[s]?.label || '全部'}
                    </button>
                  ))}
                </div>

                {shipModal.open && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShipModal({ open: false, orderId: 0 })}>
                    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-brand-text text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-brand-orange" />发货 - 订单 #{shipModal.orderId}</h3>
                        <button onClick={() => setShipModal({ open: false, orderId: 0 })} className="text-brand-text-dim hover:text-brand-text p-1"><X className="w-5 h-5" /></button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-brand-text-dim mb-1">运单号</label>
                          <input type="text" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} placeholder="输入快递单号"
                            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                        </div>
                        {shipError && <p className="text-xs text-red-400">{shipError}</p>}
                        <button onClick={async () => {
                          if (!trackingNo.trim()) { setShipError('请输入运单号'); return }
                          setShipping(true); setShipError('')
                          try { await updateOrderStatus(shipModal.orderId, 'shipped', trackingNo.trim()); setShipModal({ open: false, orderId: 0 }); loadOrders() }
                          catch (e: any) { setShipError(typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : '发货失败') }
                          finally { setShipping(false) }
                        }} disabled={shipping}
                          className="w-full py-2.5 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange/90 disabled:opacity-50 flex items-center justify-center gap-2">
                          {shipping ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{shipping ? '发货中...' : '确认发货'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-brand-text-dim border-b border-brand-border">
                        <th className="pb-3 font-medium">订单号</th>
                        <th className="pb-3 font-medium">模型</th>
                        <th className="pb-3 font-medium">金额</th>
                        <th className="pb-3 font-medium">状态</th>
                        <th className="pb-3 font-medium">运单号</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                          <td className="py-3 text-xs font-mono text-brand-text-dim">{o.order_no}</td>
                          <td className="py-3 text-sm text-brand-text">{o.model_name || '-'}</td>
                          <td className="py-3 text-sm text-brand-text">¥{o.total_price.toFixed(2)}</td>
                          <td className="py-3"><span className={`px-2.5 py-1 text-xs rounded-full ${orderStatusMap[o.status]?.color || ''}`}>{orderStatusMap[o.status]?.label || o.status}</span></td>
                          <td className="py-3 text-xs text-brand-text-dim">{o.tracking_no || '-'}</td>
                          <td className="py-3">{(o.status === 'paid' || o.status === 'printing') ? (
                            <button onClick={() => { setShipModal({ open: true, orderId: o.id }); setTrackingNo(o.tracking_no || ''); setShipError('') }}
                              className="px-3 py-1.5 text-xs bg-brand-orange/10 text-brand-orange rounded-lg hover:bg-brand-orange/20">发货</button>
                          ) : <span className="text-xs text-brand-text-dim">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={ordersPage} pageSize={ORDERS_PAGE_SIZE} total={ordersTotal} onPageChange={loadOrders} />
              </div>
            )}

            {/* 模型管理 */}
            {activeTab === 'models' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">模型管理</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-orange/10 text-brand-orange rounded-lg hover:bg-brand-orange/20 transition-colors"><Upload className="w-3.5 h-3.5" />上传模型</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <input type="text" value={modelsSearch} onChange={e => setModelsSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadModels() }} placeholder="搜索模型名..." className="w-full sm:w-64 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                  {['', 'pending', 'approved', 'rejected'].map(s => (
                    <button key={s} onClick={() => { setModelFilter(s); loadModels() }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${modelFilter === s ? 'bg-brand-orange/15 text-brand-orange' : 'text-brand-text-dim bg-brand-panel hover:bg-brand-panel/70'}`}>
                      {modelStatusMap[s]?.label || '全部'}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-brand-text-dim border-b border-brand-border">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">名称</th>
                        <th className="pb-3 font-medium">分类</th>
                        <th className="pb-3 font-medium">价格</th>
                        <th className="pb-3 font-medium">状态</th>
                        <th className="pb-3 font-medium">上传者</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map(m => (
                        <tr key={m.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                          <td className="py-3 text-xs font-mono text-brand-text-dim">{m.id}</td>
                          <td className="py-3 text-sm text-brand-text">{m.name}</td>
                          <td className="py-3 text-xs text-brand-text-dim">{m.category || '-'}</td>
                          <td className="py-3 text-sm text-brand-text">¥{m.base_price?.toFixed(2) || '0.00'}</td>
                          <td className="py-3"><span className={`px-2.5 py-1 text-xs rounded-full ${modelStatusMap[m.status]?.color || ''}`}>{modelStatusMap[m.status]?.label || m.status}</span></td>
                          <td className="py-3 text-xs text-brand-text-dim">{m.uploader_id || '-'}</td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              {m.status === 'pending' && (<>
                                <button onClick={() => updateModelStatus(m.id, 'approved').then(() => loadModels())} className="px-2 py-1 text-xs bg-emerald-400/10 text-emerald-400 rounded hover:bg-emerald-400/20">通过</button>
                                <button onClick={() => updateModelStatus(m.id, 'rejected').then(() => loadModels())} className="px-2 py-1 text-xs bg-red-400/10 text-red-400 rounded hover:bg-red-400/20">拒绝</button>
                              </>)}
                              <button onClick={() => handleDeleteModel(m.id, m.name)} disabled={deletingId === m.id} className="px-2 py-1 text-xs bg-red-400/10 text-red-400 rounded hover:bg-red-400/20 disabled:opacity-50">{deletingId === m.id ? '删除中...' : '删除'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={modelsPage} pageSize={MODELS_PAGE_SIZE} total={modelsTotal} onPageChange={loadModels} />
                <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); loadModels() }} />
              </div>
            )}

            {/* 材料管理 */}
            {activeTab === 'materials' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">材料管理</h2>
                  <button onClick={() => openMaterialForm()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-orange/10 text-brand-orange rounded-lg hover:bg-brand-orange/20"><span className="text-base leading-none">+</span> 新建材料</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-brand-text-dim border-b border-brand-border">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">名称</th>
                        <th className="pb-3 font-medium">单价</th>
                        <th className="pb-3 font-medium">密度</th>
                        <th className="pb-3 font-medium">状态</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map(m => (
                        <tr key={m.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                          <td className="py-3 text-xs font-mono text-brand-text-dim">{m.id}</td>
                          <td className="py-3 text-sm text-brand-text">{m.name_zh}（{m.name_en}）</td>
                          <td className="py-3 text-sm text-brand-text">¥{m.price_per_gram.toFixed(2)}</td>
                          <td className="py-3 text-xs text-brand-text-dim">{m.density} g/cm³</td>
                          <td className="py-3"><span className={'px-2.5 py-1 text-xs rounded-full ' + (m.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400')}>{m.is_active ? '启用' : '禁用'}</span></td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openMaterialForm(m)} className="px-2 py-1 text-xs bg-brand-blue/10 text-brand-blue rounded hover:bg-brand-blue/20">编辑</button>
                              <button onClick={() => deleteMaterialHandler(m.id, m.name_zh)} className="px-2 py-1 text-xs bg-red-400/10 text-red-400 rounded hover:bg-red-400/20">删除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* 材料编辑弹窗 */}
                {showMaterialForm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMaterialForm(false)}>
                    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                      <h3 className="font-semibold text-brand-text text-sm mb-4">{materialEdit ? '编辑材料' : '新建材料'}</h3>
                      <div className="space-y-3">
                        <div><label className="text-xs text-brand-text-dim block mb-1">中文名称</label>
                          <input type="text" value={materialForm.name_zh} onChange={e => setMaterialForm(f => ({...f, name_zh: e.target.value}))} placeholder="如：PLA" className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" /></div>
                        <div><label className="text-xs text-brand-text-dim block mb-1">英文名称</label>
                          <input type="text" value={materialForm.name_en} onChange={e => setMaterialForm(f => ({...f, name_en: e.target.value}))} placeholder="如：Polylactic Acid" className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs text-brand-text-dim block mb-1">单价（元/克）</label>
                            <input type="number" step="0.01" value={materialForm.price_per_gram} onChange={e => setMaterialForm(f => ({...f, price_per_gram: parseFloat(e.target.value) || 0}))} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-orange/50" /></div>
                          <div><label className="text-xs text-brand-text-dim block mb-1">密度 (g/cm³)</label>
                            <input type="number" step="0.01" value={materialForm.density} onChange={e => setMaterialForm(f => ({...f, density: parseFloat(e.target.value) || 1.25}))} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-orange/50" /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="mat-active" checked={materialForm.is_active} onChange={e => setMaterialForm(f => ({...f, is_active: e.target.checked}))} className="accent-brand-orange" />
                          <label htmlFor="mat-active" className="text-xs text-brand-text">启用</label>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={saveMaterial} disabled={materialSaving} className="flex-1 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange/90 disabled:opacity-50 flex items-center justify-center gap-2">
                            {materialSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{materialSaving ? '保存中...' : materialEdit ? '更新' : '创建'}</button>
                          <button onClick={() => setShowMaterialForm(false)} className="px-4 py-2 text-sm text-brand-text-dim border border-brand-border rounded-lg hover:text-brand-text">取消</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 帮助管理 */}
            {activeTab === 'help' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">帮助管理</h2>
                  <button onClick={() => openHelpForm()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-orange/10 text-brand-orange rounded-lg hover:bg-brand-orange/20"><span className="text-base leading-none">+</span> 新建文章</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-brand-text-dim border-b border-brand-border">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">标题</th>
                        <th className="pb-3 font-medium">分区</th>
                        <th className="pb-3 font-medium">排序</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {helpArticles.map(a => (
                        <tr key={a.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                          <td className="py-3 text-xs font-mono text-brand-text-dim">{a.id}</td>
                          <td className="py-3 text-sm text-brand-text">{a.title}</td>
                          <td className="py-3 text-xs text-brand-text-dim">{a.section}</td>
                          <td className="py-3 text-xs text-brand-text-dim">{a.sort_order}</td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openHelpForm(a)} className="px-2 py-1 text-xs bg-brand-blue/10 text-brand-blue rounded hover:bg-brand-blue/20">编辑</button>
                              <button onClick={() => deleteHelpHandler(a.id, a.title)} className="px-2 py-1 text-xs bg-red-400/10 text-red-400 rounded hover:bg-red-400/20">删除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* 帮助文章编辑弹窗 */}
                {showHelpForm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHelpForm(false)}>
                    <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                      <h3 className="font-semibold text-brand-text text-sm mb-4">{helpEdit ? '编辑文章' : '新建文章'}</h3>
                      <div className="space-y-3">
                        <div><label className="text-xs text-brand-text-dim block mb-1">标题</label>
                          <input type="text" value={helpForm.title} onChange={e => setHelpForm(f => ({...f, title: e.target.value}))} placeholder="文章标题" className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" /></div>
                        <div><label className="text-xs text-brand-text-dim block mb-1">分区</label>
                          <input type="text" value={helpForm.section} onChange={e => setHelpForm(f => ({...f, section: e.target.value}))} placeholder="如：shipping, printing, account" className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" /></div>
                        <div className="flex items-center gap-3">
                          <div><label className="text-xs text-brand-text-dim block mb-1">排序</label>
                            <input type="number" value={helpForm.sort_order} onChange={e => setHelpForm(f => ({...f, sort_order: parseInt(e.target.value) || 0}))} className="w-20 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-orange/50" /></div>
                        </div>
                        <div><label className="text-xs text-brand-text-dim block mb-1">内容（Markdown）</label>
                          <textarea value={helpForm.content} onChange={e => setHelpForm(f => ({...f, content: e.target.value}))} rows={6} placeholder="文章内容（支持 Markdown）" className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50 resize-none" /></div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={saveHelpArticle} disabled={helpSaving} className="flex-1 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange/90 disabled:opacity-50 flex items-center justify-center gap-2">
                            {helpSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{helpSaving ? '保存中...' : helpEdit ? '更新' : '创建'}</button>
                          <button onClick={() => setShowHelpForm(false)} className="px-4 py-2 text-sm text-brand-text-dim border border-brand-border rounded-lg hover:text-brand-text">取消</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 评论管理 */}
            {activeTab === 'comments' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">评论管理</h2>
                  <span className="text-xs text-brand-text-dim">共 {commentsTotal} 条</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <input type="text" value={commentsSearch} onChange={e => setCommentsSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadComments() }} placeholder="搜索评论内容..." className="w-full sm:w-64 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                  <button onClick={() => loadComments()} className="px-3 py-1.5 text-xs rounded-lg bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20">搜索</button>
                </div>
                <div className="space-y-3">
                  {comments.length === 0 ? <div className="text-center py-10 text-brand-text-dim text-sm">暂无评论</div> : (
                    comments.map(c => (
                      <div key={c.id} className="flex items-start justify-between p-4 bg-brand-bg rounded-xl border border-brand-border/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-brand-text-dim font-mono">#{c.id}</span>
                            <span className="text-xs text-brand-blue">{c.author?.username || '匿名'}</span>
                            {c.model_name && <span className="text-xs text-brand-text-dim">对 <span className="text-brand-orange">{c.model_name}</span> 的评论</span>}
                          </div>
                          <p className="text-sm text-brand-text">{c.content}</p>
                          <p className="text-xs text-brand-text-dim mt-1">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</p>
                        </div>
                        <button onClick={async () => { if (!confirm('确定删除这条评论？')) return; try { await deleteModelComment(c.id); loadComments() } catch (e: any) { alert('删除失败') } }}
                          className="p-2 text-red-400/50 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))
                  )}
                </div>
                <Pagination page={commentsPage} pageSize={COMMENTS_PAGE_SIZE} total={commentsTotal} onPageChange={loadComments} />
              </div>
            )}

            {/* 帖子管理 */}
            {activeTab === 'discussions' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">帖子管理</h2>
                  <span className="text-xs text-brand-text-dim">共 {discussionsTotal} 条</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <input type="text" value={discussionsSearch} onChange={e => setDiscussionsSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadDiscussions() }} placeholder="搜索帖子标题..." className="w-full sm:w-64 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                  <button onClick={() => loadDiscussions()} className="px-3 py-1.5 text-xs rounded-lg bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20">搜索</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-brand-text-dim border-b border-brand-border">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">标题</th>
                        <th className="pb-3 font-medium">分类</th>
                        <th className="pb-3 font-medium">作者</th>
                        <th className="pb-3 font-medium">状态</th>
                        <th className="pb-3 font-medium">回复</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discussions.map(d => (
                        <tr key={d.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                          <td className="py-3 text-xs font-mono text-brand-text-dim">{d.id}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">{d.is_pinned && <Star className="w-3.5 h-3.5 text-brand-orange" />}
                              <span className={`text-sm ${d.is_locked ? 'text-brand-text-dim' : 'text-brand-text'}`}>{d.title}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 text-xs rounded ${d.category === 'general' ? 'bg-brand-blue/15 text-brand-blue border-brand-blue/30' : d.category === 'help' ? 'bg-brand-orange/15 text-brand-orange border-brand-orange/30' : d.category === 'showcase' ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' : 'bg-violet-500/15 text-violet-400 border-violet-500/30'}`}>
                              {categoryNames[d.category] || d.category}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-brand-text-dim">{d.author?.username || '匿名'}</td>
                          <td className="py-3">{d.is_locked ? <span className="px-2 py-0.5 text-xs rounded bg-red-400/10 text-red-400">已锁定</span> : <span className="px-2 py-0.5 text-xs rounded bg-emerald-400/10 text-emerald-400">正常</span>}</td>
                          <td className="py-3 text-xs text-brand-text-dim">{d.reply_count}</td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button onClick={async () => { try { await (d.is_locked ? updateDiscussion(d.id, { is_locked: false }) : updateDiscussion(d.id, { is_locked: true })); loadDiscussions() } catch (e: any) { alert('操作失败') } }}
                                className={`px-2 py-1 text-xs rounded ${d.is_locked ? 'bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20' : 'bg-red-400/10 text-red-400 hover:bg-red-400/20'}`}>{d.is_locked ? '解锁' : '锁定'}</button>
                              <button onClick={async () => { try { await (d.is_pinned ? updateDiscussion(d.id, { is_pinned: false }) : updateDiscussion(d.id, { is_pinned: true })); loadDiscussions() } catch (e: any) { alert('操作失败') } }}
                                className={`px-2 py-1 text-xs rounded ${d.is_pinned ? 'bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20' : 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'}`}>{d.is_pinned ? '取消置顶' : '置顶'}</button>
                              <button onClick={async () => { if (!confirm("确定删除帖子？")) return; setDeletingDiscussionId(d.id); try { await deleteDiscussion(d.id); loadDiscussions() } catch (e: any) { alert('删除失败') } finally { setDeletingDiscussionId(null) } }}
                                disabled={deletingDiscussionId === d.id} className="px-2 py-1 text-xs bg-red-400/10 text-red-400 rounded hover:bg-red-400/20 disabled:opacity-50">{deletingDiscussionId === d.id ? '删除中...' : '删除'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={discussionsPage} pageSize={DISCUSSIONS_PAGE_SIZE} total={discussionsTotal} onPageChange={loadDiscussions} />
              </div>
            )}

            {/* 回帖管理 */}
            {activeTab === 'replies' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">回帖管理</h2>
                  <span className="text-xs text-brand-text-dim">共 {repliesTotal} 条</span>
                </div>
                <div className="mb-4">
                  <input type="text" value={repliesSearch} onChange={e => setRepliesSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadReplies() }} placeholder="搜索回帖内容..." className="w-full sm:w-64 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                  <button onClick={() => loadReplies()} className="px-3 py-1.5 text-xs rounded-lg bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20">搜索</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-brand-text-dim border-b border-brand-border">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">内容</th>
                        <th className="pb-3 font-medium">所属帖子</th>
                        <th className="pb-3 font-medium">作者</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {replies.map(r => (
                        <tr key={r.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                          <td className="py-3 text-xs font-mono text-brand-text-dim">{r.id}</td>
                          <td className="py-3 text-sm text-brand-text max-w-[300px] truncate">{r.content}</td>
                          <td className="py-3 text-xs text-brand-text-dim">{r.discussion_title || '-'}</td>
                          <td className="py-3 text-xs text-brand-text-dim">{r.author?.username || '匿名'}</td>
                          <td className="py-3">
                            <button onClick={async () => { if (!confirm("确定删除此回帖？")) return; setDeletingReplyId(r.id); try { await deleteReply(r.id); loadReplies() } catch (e: any) { alert("删除失败") } finally { setDeletingReplyId(null) } }}
                              disabled={deletingReplyId === r.id}
                              className="px-2 py-1 text-xs bg-red-400/10 text-red-400 rounded hover:bg-red-400/20 disabled:opacity-50">{deletingReplyId === r.id ? '删除中...' : '删除'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={repliesPage} pageSize={15} total={repliesTotal} onPageChange={loadReplies} />
              </div>
            )}

            {/* 公告管理 */}
            {activeTab === 'announcements' && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 左侧：编辑表单 */}
                <div className="card-base p-5 lg:w-96 shrink-0">
                  <h2 className="text-sm font-semibold text-brand-text mb-4">{announceEdit ? '编辑公告' : '新建公告'}</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-brand-text-dim mb-1 block">标题</label>
                      <input type="text" value={announceForm.title} onChange={e => setAnnounceForm(f => ({ ...f, title: e.target.value }))} placeholder="公告标题"
                        className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                    </div>
                    <div>
                      <label className="text-xs text-brand-text-dim mb-1 block">摘要</label>
                      <input type="text" value={announceForm.summary} onChange={e => setAnnounceForm(f => ({ ...f, summary: e.target.value }))} placeholder="简短摘要"
                        className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                    </div>
                    <div>
                      <label className="text-xs text-brand-text-dim mb-1 block">内容（Markdown）</label>
                      <textarea value={announceForm.content} onChange={e => setAnnounceForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder="公告内容（支持 Markdown）"
                        className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50 resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        if (!announceForm.title.trim()) { alert("请输入标题"); return }
                        if (!announceForm.content.trim()) { alert("请输入内容"); return }
                        try {
                          if (announceEdit) { await updateAnnouncement(announceEdit.id, announceForm) }
                          else { await createAnnouncement(announceForm) }
                          setAnnounceForm({ title: "", summary: "", content: "", cover_url: "" }); setAnnounceEdit(null); loadAnnouncements()
                        } catch (e: any) { alert(typeof e?.response?.data?.detail === "string" ? e.response.data.detail : "操作失败") }
                      }} className="flex-1 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange/90 transition-colors">
                        {announceEdit ? '更新' : '发布'}
                      </button>
                      {announceEdit && (
                        <button onClick={() => { setAnnounceEdit(null); setAnnounceForm({ title: "", summary: "", content: "", cover_url: "" }) }}
                          className="px-4 py-2 text-sm text-brand-text-dim border border-brand-border rounded-lg hover:text-brand-text transition-colors">取消</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧：公告列表 */}
                <div className="flex-1 card-base p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-brand-text">公告列表</h2>
                    <span className="text-xs text-brand-text-dim">共 {announcementsTotal} 条</span>
                  </div>
                  <div className="mb-4">
                    <input type="text" value={announceSearch} onChange={e => setAnnounceSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadAnnouncements() }} placeholder="搜索公告标题..."
                      className="w-full sm:w-64 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50" />
                  <button onClick={() => loadAnnouncements()} className="px-3 py-1.5 text-xs rounded-lg bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20">搜索</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-brand-text-dim border-b border-brand-border">
                          <th className="pb-3 font-medium">ID</th>
                          <th className="pb-3 font-medium">标题</th>
                          <th className="pb-3 font-medium">状态</th>
                          <th className="pb-3 font-medium">置顶</th>
                          <th className="pb-3 font-medium">创建时间</th>
                          <th className="pb-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {announcements.map(a => (
                          <tr key={a.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                            <td className="py-3 text-xs font-mono text-brand-text-dim">{a.id}</td>
                            <td className="py-3 text-sm text-brand-text">{a.title}</td>
                            <td className="py-3">
                              <span className={`px-2.5 py-1 text-xs rounded-full ${a.status === 'published' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {a.status === 'published' ? '已发布' : '草稿'}
                              </span>
                            </td>
                            <td className="py-3 text-xs text-brand-text-dim">{a.is_pinned ? '📌' : '-'}</td>
                            <td className="py-3 text-xs text-brand-text-dim">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <button onClick={() => { setAnnounceEdit(a); setAnnounceForm({ title: a.title, summary: a.summary || "", content: a.content, cover_url: a.cover_url || "" }) }}
                                  className="px-2 py-1 text-xs bg-brand-blue/10 text-brand-blue rounded hover:bg-brand-blue/20">编辑</button>
                                <button onClick={async () => { if (!confirm("确定删除公告？")) return; try { await deleteAnnouncement(a.id); loadAnnouncements(); if (announceEdit?.id === a.id) { setAnnounceEdit(null); setAnnounceForm({ title: "", summary: "", content: "", cover_url: "" }) } } catch (e: any) { alert("删除失败") } }}
                                  className="px-2 py-1 text-xs bg-red-400/10 text-red-400 rounded hover:bg-red-400/20">删除</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={announcePage} pageSize={ANNOUNCE_PAGE_SIZE} total={announcementsTotal} onPageChange={loadAnnouncements} />
                </div>
              </div>
            )}

            {/* 举报管理 */}
            {activeTab === 'reports' && (
              <div className="card-base p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-brand-text">举报管理</h2>
                  <span className="text-xs text-brand-text-dim">{reports.filter(r => r.status === 'pending').length} 条待处理 / 共 {reports.length} 条</span>
                </div>
                <div className="flex gap-2 mb-4">
                  {['pending', 'all'].map(opt => (
                    <button key={opt} onClick={() => setReportFilter(opt as 'all' | 'pending')}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${reportFilter === opt ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/40' : 'text-brand-text-dim border-brand-border hover:border-brand-orange/30'}`}>
                      {opt === 'pending' ? '待处理' : '全部'}
                    </button>
                  ))}
                </div>
                {(() => {
                  const filtered = reportFilter === 'pending' ? reports.filter(r => r.status === 'pending') : reports
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 text-brand-text-dim text-sm">
                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>{reportFilter === 'pending' ? '暂无待处理的举报' : '暂无举报记录'}</p>
                      </div>
                    )
                  }
                  const typeLabels: Record<string, string> = { model: '模型', discussion: '帖子', reply: '回帖', comment: '评论' }
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-brand-text-dim border-b border-brand-border">
                            <th className="pb-3 font-medium">ID</th>
                            <th className="pb-3 font-medium">类型</th>
                            <th className="pb-3 font-medium">被举报内容</th>
                            <th className="pb-3 font-medium">举报人</th>
                            <th className="pb-3 font-medium">原因</th>
                            <th className="pb-3 font-medium">处理人</th>
                            <th className="pb-3 font-medium">状态</th>
                            <th className="pb-3 font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(r => (
                            <tr key={r.id} className={`border-b border-brand-border/50 hover:bg-brand-panel/50 ${r.status === 'pending' ? 'bg-brand-orange/[0.02]' : ''}`}>
                              <td className="py-3 text-xs font-mono text-brand-text">{r.id}</td>
                              <td className="py-3"><span className={`text-xs px-1.5 py-0.5 rounded-full border ${({model:'bg-brand-orange/10 text-brand-orange border-brand-orange/30',discussion:'bg-brand-blue/10 text-brand-blue border-brand-blue/30',reply:'bg-violet-500/10 text-violet-400 border-violet-500/30',comment:'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'})[r.target_type] || 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'}`}>{typeLabels[r.target_type] || r.target_type}</span></td>
                              <td className="py-3 text-xs text-brand-text-dim max-w-[200px] truncate">{r.reason}</td>
                              <td className="py-3 text-xs text-brand-text-dim">{r.reporter_name || '匿名'}</td>
                              <td className="py-3 text-xs text-brand-text-dim">{r.reason}</td>
                              <td className="py-3 text-xs text-brand-text-dim">{'-'}</td>
                              <td className="py-3">
                                <span className={`px-2.5 py-1 text-xs rounded-full ${r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30'}`}>
                                  {r.status === 'pending' ? '待处理' : '已处理'}
                                </span>
                              </td>
                              <td className="py-3">
                                {r.status === 'pending' ? (
                                  <button onClick={async () => {
                                    if (!confirm("标记为已处理？")) return
                                    setHandlingReportId(r.id)
                                    try {
                                      const updated = await handleReport(r.id, 'actioned')
                                      if (updated) {
                                        const idx = reports.findIndex(x => x.id === r.id)
                                        if (idx >= 0) { const newReports = [...reports]; newReports[idx] = updated; setReports(newReports) }
                                      }
                                    } catch (e: any) { alert(typeof e?.response?.data?.detail === 'string' ? e.response.data.detail : '操作失败') }
                                    finally { setHandlingReportId(null) }
                                  }} disabled={handlingReportId === r.id}
                                    className="px-3 py-1.5 text-xs bg-brand-orange/10 text-brand-orange rounded-lg hover:bg-brand-orange/20 disabled:opacity-50">
                                    {handlingReportId === r.id ? '处理中...' : '标记已处理'}
                                  </button>
                                ) : <span className="text-xs text-emerald-400/70">已处理</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* 用户管理（仅超级管理员） */}
            {activeTab === 'users' && isSuperAdmin && (
              <div className="card-base p-5">
                <h2 className="text-sm font-semibold text-brand-text mb-4">用户管理</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-brand-text-dim border-b border-brand-border">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">用户名</th>
                        <th className="pb-3 font-medium">手机号</th>
                        <th className="pb-3 font-medium">角色</th>
                        <th className="pb-3 font-medium">注册时间</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(u => (
                        <tr key={u.id} className="border-b border-brand-border/50 hover:bg-brand-panel/50">
                          <td className="py-3 text-xs font-mono text-brand-text-dim">{u.id}</td>
                          <td className="py-3 text-sm text-brand-text flex items-center gap-2">
                            {u.username}
                            {u.role === 'super_admin' && <Crown className="w-4 h-4 text-brand-orange" />}
                            {u.role === 'admin' && <Shield className="w-4 h-4 text-brand-blue" />}
                          </td>
                          <td className="py-3 text-xs text-brand-text-dim">{u.phone || '-'}</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 text-xs rounded-full ${u.role === 'super_admin' ? 'bg-brand-orange/10 text-brand-orange' : u.role === 'admin' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-text-dim/10 text-brand-text-dim'}`}>
                              {u.role === 'super_admin' ? '超级管理员' : u.role === 'admin' ? '管理员' : '用户'}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-brand-text-dim">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                          <td className="py-3">
                            {u.role !== 'super_admin' ? (
                              <button onClick={async () => {
                                setSettingRole(u.id)
                                try { await setUserRole(u.id, u.role === 'user' ? 'admin' : 'user'); setAllUsers(allUsers.map(x => x.id === u.id ? { ...x, role: u.role === 'user' ? 'admin' : 'user' } : x)) }
                                catch (e: any) { alert('操作失败') }
                                finally { setSettingRole(null) }
                              }} disabled={settingRole === u.id}
                                className={`px-2 py-1 text-xs rounded disabled:opacity-50 ${u.role === 'user' ? 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20' : 'bg-red-400/10 text-red-400 hover:bg-red-400/20'}`}>
                                {u.role === 'user' ? '设为管理员' : '取消管理员'}
                              </button>
                            ) : <span className="text-xs text-brand-text-dim">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-brand-text-dim">共 {allUsers.length} 个用户</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>

  )
}
