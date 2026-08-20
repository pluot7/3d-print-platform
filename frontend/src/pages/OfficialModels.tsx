import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getModels, ModelResponse } from '../api/models'
import { Shield, Star, Search, SlidersHorizontal, Eye, Heart, Box, Loader2, ArrowUpDown, Clock } from 'lucide-react'

const featuredCategories = [
  { name: '手办人物', value: 'figure', icon: '🎮', color: 'from-violet-500 to-purple-600' },
  { name: '机械零件', value: 'mechanical', icon: '⚙️', color: 'from-brand-orange to-amber-600' },
  { name: '建筑模型', value: 'architectural', icon: '🏗️', color: 'from-emerald-500 to-teal-600' },
  { name: '艺术摆件', value: 'art', icon: '🎨', color: 'from-brand-blue to-indigo-600' },
  { name: '其他', value: 'other', icon: '📦', color: 'from-rose-500 to-pink-600' },
]

const API_BASE = ''

const categoryNames: Record<string, string> = {
  figure: '手办人物',
  mechanical: '机械零件',
  architectural: '建筑模型',
  art: '艺术摆件',
  other: '其他',
}

export default function OfficialModels() {
  const [models, setModels] = useState<ModelResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSort, setActiveSort] = useState('upload_time')
  const [totalCount, setTotalCount] = useState(0)
  const [officialPage, setOfficialPage] = useState(1)
  const [hasMoreOfficial, setHasMoreOfficial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const PAGE_SIZE = 12

  const fetchModels = async (opts?: { category?: string; searchTerm?: string; sort?: string; page?: number; append?: boolean }) => {
    const page = opts?.page || 1
    const isAppend = opts?.append || false
    if (!isAppend) setLoading(true)
    try {
      const res = await getModels({
        official_only: true,
        category: opts?.category || undefined,
        search: opts?.searchTerm || undefined,
        sort: opts?.sort || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      if (isAppend) {
        setModels(prev => [...prev, ...res.items])
      } else {
        setModels(res.items)
      }
      setTotalCount(res.total)
      setHasMoreOfficial(page * PAGE_SIZE < res.total)
      setOfficialPage(page)
    } catch (err) {
      console.error('Failed to fetch official models:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const handleCategoryClick = (category: string) => {
    const newCategory = activeCategory === category ? null : category
    setActiveCategory(newCategory)
    fetchModels({ category: newCategory || undefined, searchTerm: search || undefined, sort: activeSort, page: 1 })
  }

  const handleSearch = () => {
    fetchModels({ category: activeCategory || undefined, searchTerm: search || undefined, sort: activeSort, page: 1 })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleSortChange = (sort: string) => {
    setActiveSort(sort)
    fetchModels({ category: activeCategory || undefined, searchTerm: search || undefined, sort, page: 1 })
  }

  const handleLoadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const next = officialPage + 1
      await fetchModels({ category: activeCategory || undefined, searchTerm: search || undefined, sort: activeSort, page: next, append: true })
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Banner */}
      <section className="relative py-16 overflow-hidden bg-brand-panel">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute inset-0 bg-glow-blue opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-brand-blue" />
            <h1 className="text-3xl font-bold text-brand-text">官方模型库</h1>
          </div>
          <p className="text-brand-text-muted max-w-xl">
            由专业团队精心设计和优化的3D模型，附带推荐打印参数，品质保证，开箱即印
          </p>

          {/* 搜索栏 */}
          <div className="mt-6 flex gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
              <input
                type="text"
                placeholder="搜索官方模型..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg
                         text-brand-text placeholder:text-brand-text-dim text-sm
                         focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg
                       hover:bg-brand-blue/80 transition-colors"
            >
              搜索
            </button>
          </div>

          {/* 特色分类 */}
          <div className="mt-8 flex flex-wrap gap-3">
            {featuredCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.value)}
                className={`group flex items-center gap-3 px-5 py-3 bg-brand-card border rounded-xl
                         transition-all duration-300 ${
                           activeCategory === cat.name
                             ? 'border-brand-blue shadow-lg shadow-brand-blue/20'
                             : 'border-brand-border hover:border-brand-blue/50'
                         }`}
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${cat.color} rounded-lg flex items-center justify-center text-sm`}>
                  {cat.icon}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-brand-text">{cat.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 模型网格 */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-text-dim" />
              <span className="text-sm text-brand-text-muted">
                {loading ? '加载中...' : `共 ${totalCount} 个官方模型`}
              </span>
              {activeCategory && (
                <span className="ml-2 px-2 py-0.5 bg-brand-blue/20 text-brand-blue text-xs rounded-md">
                  {activeCategory}
                  <button
                    onClick={() => handleCategoryClick(activeCategory)}
                    className="ml-1 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-1">
              {[
                { name: '最新', value: 'upload_time' },
                { name: '浏览', value: 'view_count' },
                { name: '收藏', value: 'favorite_count' },
              ].map(({ name, value }) => (
                <button
                  key={value}
                  onClick={() => handleSortChange(value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                    activeSort === value
                      ? 'bg-brand-blue/15 text-brand-blue border-brand-blue/30'
                      : 'bg-brand-panel text-brand-text-dim border-brand-border hover:border-brand-blue hover:text-brand-blue'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
              <span className="ml-3 text-brand-text-muted">加载中...</span>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-20">
              <Box className="w-16 h-16 text-brand-text-dim mx-auto mb-4" />
              <h3 className="text-lg font-medium text-brand-text mb-2">暂无官方模型</h3>
              <p className="text-brand-text-muted text-sm">官方模型正在筹备中，敬请期待</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {models.map((model) => (
                <Link key={model.id} to={`/model/${model.id}`} className="group block">
                  <div className="card-base overflow-hidden">
                    {/* 模型预览 */}
                    <div className="relative aspect-[4/3] bg-brand-panel flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 grid-bg opacity-30" />

                      {model.glb_path ? (
                        <img
                          src={`${API_BASE}/uploads/thumbs/${model.glb_path?.split('/').pop()?.replace('.glb', '.png') || ''}`}
                          alt={model.name}
                          className="relative z-10 w-full h-full object-cover"
                          onError={(e) => {
                            // 图片加载失败，显示3D占位图标
                            (e.target as HTMLImageElement).style.display = 'none'
                            const parent = (e.target as HTMLImageElement).parentElement
                            if (parent) {
                              const placeholder = parent.querySelector('.fallback-icon') as HTMLElement
                              if (placeholder) placeholder.style.display = 'flex'
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="fallback-icon absolute inset-0 flex items-center justify-center"
                        style={{ display: model.glb_path ? 'none' : 'flex' }}
                      >
                        <Box className="w-16 h-16 text-brand-text-dim group-hover:text-brand-blue transition-colors duration-300" />
                      </div>

                      {/* 悬浮遮罩 */}
                      <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100
                                    transition-opacity duration-300 flex items-center justify-center gap-4 z-20">
                        <div className="w-10 h-10 bg-brand-orange rounded-full flex items-center justify-center
                                      hover:bg-brand-orange-light transition-colors cursor-pointer">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      {/* 官方标签 */}
                      {model.is_official && (
                        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-brand-blue/90 text-white text-xs
                                        font-medium rounded-md">
                            <Shield className="w-3 h-3" />
                            官方
                          </span>
                          <span className="px-2 py-0.5 bg-brand-dark/70 text-brand-text-muted text-xs
                                        font-medium rounded-md border border-brand-border/50">
                            {model.category}
                          </span>
                        </div>
                      )}

                      {/* 收藏按钮 */}
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="absolute top-3 right-3 w-8 h-8 bg-brand-dark/50 backdrop-blur rounded-full
                                 flex items-center justify-center text-brand-text-dim hover:text-red-400
                                 transition-colors border border-brand-border/30 z-20"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 模型信息 */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-brand-text group-hover:text-brand-blue
                                   transition-colors truncate">
                        {model.name}
                      </h3>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-brand-text-dim">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{model.view_count || 0} 次浏览</span>
                        </div>
                        {model.weight && (
                          <span className="text-xs text-brand-text-dim">{model.weight}g</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border/50">
                        <span className="text-lg font-bold text-brand-orange">¥{model.base_price}</span>
                        <span className="text-xs text-brand-text-dim font-mono px-2 py-1 bg-brand-panel rounded">
                          {model.file_type?.toUpperCase() || '3MF'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 加载更多 */}
          {!loading && hasMoreOfficial && models.length > 0 && (
            <div className="mt-10 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 border border-brand-border text-brand-text-dim rounded-xl
                         hover:border-brand-blue hover:text-brand-blue text-sm transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />加载中...</>
                ) : (
                  <><Clock className="w-4 h-4" />加载更多（{models.length}/{totalCount}）</>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
