import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Plus, Search, Eye, MessageCircle,
  Pin, Lock, Loader2, X, AlertCircle, ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getDiscussions, createDiscussion, deleteDiscussion,
  getAvatarUrl, categoryNames, categoryColors,
  DiscussionCategory, DiscussionResponse,
} from '../api/discussions'

const API_BASE = 'http://localhost:8000'

const categoryOptions: { value: DiscussionCategory | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'general', label: '综合' },
  { value: 'help', label: '求助' },
  { value: 'showcase', label: '作品展示' },
  { value: 'tech', label: '技术交流' },
]

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function Community() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const [discussions, setDiscussions] = useState<DiscussionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const [activeCategory, setActiveCategory] = useState<DiscussionCategory | ''>('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createCategory, setCreateCategory] = useState<DiscussionCategory>('general')
  const [createContent, setCreateContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const fetchData = async (cat?: DiscussionCategory | '', kw?: string, pg = 1) => {
    setLoading(true)
    try {
      const res = await getDiscussions({
        category: cat || undefined,
        keyword: kw || undefined,
        page: pg,
        page_size: pageSize,
      })
      setDiscussions(res.items)
      setTotal(res.total)
      setPage(pg)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(activeCategory, searchKeyword)
  }, [])

  const handleCategoryClick = (cat: DiscussionCategory | '') => {
    setActiveCategory(cat)
    setPage(1)
    fetchData(cat, searchKeyword)
  }

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim())
    setPage(1)
    fetchData(activeCategory, searchInput.trim())
  }

  const handleCreate = async () => {
    if (!createTitle.trim() || !createContent.trim()) {
      setCreateError('标题和内容不能为空')
      return
    }
    setSubmitting(true)
    setCreateError('')
    try {
      const d = await createDiscussion({
        title: createTitle.trim(),
        content: createContent.trim(),
        category: createCategory,
      })
      setShowCreate(false)
      setCreateTitle('')
      setCreateContent('')
      fetchData(activeCategory, searchKeyword)
    } catch (e: any) {
      setCreateError(e.response?.data?.detail || '发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDiscussion(id)
      setDiscussions(prev => prev.filter(d => d.id !== id))
      setTotal(prev => prev - 1)
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-orange/15 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-text">社区讨论</h1>
            <p className="text-sm text-brand-text-dim">{total} 个主题帖</p>
          </div>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg
                       hover:bg-brand-orange/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            发布新帖
          </button>
        )}
      </div>

      {/* 引导提示 */}
      {total === 0 && !loading && (
        <div className="card-base p-8 text-center mb-6">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-brand-text-dim opacity-30" />
          <h3 className="text-lg font-medium text-brand-text mb-2">还没有讨论帖</h3>
          <p className="text-sm text-brand-text-dim mb-6">
            来做第一个发起话题的人吧！分享你的3D模型、打印经验或求助问题
          </p>
          {isAuthenticated ? (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-white rounded-lg
                         hover:bg-brand-orange/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              发布第一帖
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-lg
                         hover:bg-blue-500 transition-colors text-sm font-medium"
            >
              登录后发帖
            </Link>
          )}
        </div>
      )}

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categoryOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleCategoryClick(opt.value)}
            className={`px-4 py-1.5 text-sm rounded-full border transition-all duration-200
              ${activeCategory === opt.value
                ? 'bg-brand-orange/15 text-brand-orange border-brand-orange/40'
                : 'bg-brand-panel text-brand-text-dim border-brand-border hover:border-brand-orange hover:text-brand-orange'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 搜索框 */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索讨论标题或内容..."
            className="w-full pl-10 pr-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                       text-sm text-brand-text placeholder:text-brand-text-dim
                       focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-5 py-2.5 bg-brand-blue text-white rounded-lg text-sm
                     hover:bg-brand-blue/90 transition-colors"
        >
          搜索
        </button>
      </div>

      {/* 帖子列表 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
        </div>
      ) : discussions.length === 0 ? (
        <div className="card-base py-16 text-center">
          <MessageCircle className="w-12 h-12 text-brand-text-dim mx-auto mb-3 opacity-50" />
          <p className="text-brand-text-dim">还没有讨论帖，来发表第一个吧！</p>
          {isAuthenticated && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 text-brand-orange text-sm hover:underline"
            >
              发布新帖 →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map(d => (
            <div
              key={d.id}
              className="card-base p-4 hover:border-brand-border/80 transition-colors cursor-pointer group"
              onClick={() => navigate(`/community/${d.id}`)}
            >
              <div className="flex items-start gap-3">
                {/* 头像 */}
                <Link to={`/user/${d.author.id}`} onClick={e => e.stopPropagation()}>
                  <img
                    src={getAvatarUrl(d.author)}
                    alt={d.author.username}
                    className="w-9 h-9 rounded-full shrink-0 mt-0.5 bg-brand-panel hover:opacity-80 transition-opacity"
                  />
                </Link>
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {d.is_pinned && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-orange/15
                                       text-brand-orange text-xs rounded border border-brand-orange/30">
                        <Pin className="w-3 h-3" />置顶
                      </span>
                    )}
                    {d.is_locked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-panel
                                       text-brand-text-dim text-xs rounded border border-brand-border">
                        <Lock className="w-3 h-3" />已锁定
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded border ${categoryColors[d.category]}`}>
                      {categoryNames[d.category]}
                    </span>
                  </div>

                  <h3 className="text-brand-text font-medium group-hover:text-brand-orange transition-colors truncate">
                    {d.title}
                  </h3>

                  <div className="flex items-center gap-4 mt-1.5 text-xs text-brand-text-dim">
                    <span className="font-medium text-brand-text/70">{d.author.username}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />{d.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />{d.reply_count}
                    </span>
                    <span>{formatTime(d.created_at)}</span>
                  </div>
                </div>

                {/* 删除按钮（作者或管理员） */}
                {(user?.id === d.user_id || user?.role === 'admin' || user?.role === 'super_admin') && (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(d.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-brand-text-dim
                               hover:text-red-400 transition-all shrink-0"
                    title="删除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => fetchData(activeCategory, searchKeyword, page - 1)}
                className="px-3 py-1.5 bg-brand-panel border border-brand-border rounded text-sm
                           text-brand-text disabled:opacity-40 hover:border-brand-blue transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm text-brand-text-dim">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchData(activeCategory, searchKeyword, page + 1)}
                className="px-3 py-1.5 bg-brand-panel border border-brand-border rounded text-sm
                           text-brand-text disabled:opacity-40 hover:border-brand-blue transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 发帖弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShowCreate(false)}>
          <div className="card-base w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-brand-text">发布新帖</h2>
              <button onClick={() => setShowCreate(false)} className="text-brand-text-dim hover:text-brand-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg
                              flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">标题</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  maxLength={200}
                  placeholder="简洁明了地描述你的问题或话题"
                  className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                             text-sm text-brand-text placeholder:text-brand-text-dim
                             focus:outline-none focus:border-brand-blue transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">分类</label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.filter(o => o.value !== '').map(opt => (
                    <button
                      key={opt.value!}
                      onClick={() => setCreateCategory(opt.value as DiscussionCategory)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all
                        ${createCategory === opt.value
                          ? 'bg-brand-orange/15 text-brand-orange border-brand-orange/40'
                          : 'bg-brand-panel text-brand-text-dim border-brand-border hover:border-brand-orange'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">内容</label>
                <textarea
                  value={createContent}
                  onChange={e => setCreateContent(e.target.value)}
                  rows={8}
                  placeholder="详细描述你的内容..."
                  className="w-full px-4 py-3 bg-brand-panel border border-brand-border rounded-lg
                             text-sm text-brand-text placeholder:text-brand-text-dim
                             focus:outline-none focus:border-brand-blue transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                             text-sm text-brand-text hover:border-brand-border/80 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-medium
                             hover:bg-brand-orange/90 transition-colors disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '发布'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setConfirmDelete(null)}>
          <div className="card-base w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-text mb-2">确认删除</h3>
            <p className="text-sm text-brand-text-dim mb-5">确定要删除这条帖子吗？该操作不可撤销，所有回帖也会一并删除。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                      className="px-4 py-2 bg-brand-panel border border-brand-border rounded-lg
                                 text-sm text-brand-text hover:border-brand-border/80">
                取消
              </button>
              <button onClick={() => handleDelete(confirmDelete!)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm
                                 hover:bg-red-600 transition-colors">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
