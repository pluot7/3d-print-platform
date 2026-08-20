import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import ModelCard from '../components/ModelCard'
import FilterSidebar from '../components/FilterSidebar'
import { Shield, TrendingUp, Clock, ArrowRight, LayoutGrid, List, Loader2, ChevronLeft, ChevronRight, Bell, ArrowUpRight } from 'lucide-react'
import { getModels, ModelResponse } from '../api/models'
import { getBriefAnnouncements, Announcement } from '../api/announcements'

export default function Home() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [officialModels, setOfficialModels] = useState<ModelResponse[]>([])
  const [communityModels, setCommunityModels] = useState<ModelResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSort, setActiveSort] = useState('upload_time')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [communityPage, setCommunityPage] = useState(1)
  const [hasMoreCommunity, setHasMoreCommunity] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const carouselRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 获取模型数据
  const fetchModels = async (opts?: { category?: string; search?: string; sort?: string }) => {
    try {
      setLoading(true)
      // 获取官方精选（跑马灯用7个）
      const officialRes = await getModels({ official_only: true, page_size: 7 })
      setOfficialModels(officialRes.items)

      // 获取社区模型（仅非官方）
      const communityRes = await getModels({
        community_only: true,
        category: opts?.category || undefined,
        search: opts?.search || undefined,
        sort: opts?.sort || undefined,
        page: 1,
        page_size: 6,
      })
      setCommunityModels(communityRes.items)
      setCommunityPage(1)
      setHasMoreCommunity(communityRes.items.length < communityRes.total)

      // 获取公告速览
      try {
        const annRes = await getBriefAnnouncements(5)
        setAnnouncements(annRes.items)
      } catch {}
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  // 跑马灯自动播放
  useEffect(() => {
    if (officialModels.length === 0) return
    carouselRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % officialModels.length)
    }, 3500)
    return () => {
      if (carouselRef.current) clearInterval(carouselRef.current)
    }
  }, [officialModels.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    if (carouselRef.current) clearInterval(carouselRef.current)
    carouselRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % officialModels.length)
    }, 3500)
  }

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + officialModels.length) % officialModels.length)
    resetTimer()
  }

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % officialModels.length)
    resetTimer()
  }

  const resetTimer = () => {
    if (carouselRef.current) clearInterval(carouselRef.current)
    carouselRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % officialModels.length)
    }, 3500)
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    fetchModels({ category: category || undefined, search: searchQuery || undefined, sort: activeSort })
  }

  const handleSearchChange = (search: string) => {
    setSearchQuery(search)
  }

  const handleSearchSubmit = () => {
    fetchModels({ category: activeCategory || undefined, search: searchQuery || undefined, sort: activeSort })
  }

  const handleSortChange = (sort: string) => {
    setActiveSort(sort)
    fetchModels({ category: activeCategory || undefined, search: searchQuery || undefined, sort })
  }

  // 格式化价格显示
  const formatPrice = (price: number) => {
    return price.toFixed(0)
  }

  return (
    <div>
      {/* Hero 区域 */}
      <Hero />

      {/* 官方精选 */}
      <section className="relative py-16 bg-brand-dark overflow-hidden">
        <div className="absolute inset-0 bg-glow-blue opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-brand-blue rounded-full" />
              <h2 className="section-title">官方精选</h2>
              <Shield className="w-5 h-5 text-brand-blue" />
            </div>
            <Link
              to="/official"
              className="flex items-center gap-1 text-sm text-brand-blue hover:text-brand-blue-light
                       transition-colors"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
            </div>
          ) : officialModels.length > 0 ? (
            <div className="relative">
              {/* 跑马灯容器 */}
              <div className="overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {officialModels.map((model) => (
                    <Link
                      key={model.id}
                      to={`/model/${model.id}`}
                      className="min-w-full px-1"
                    >
                      <div className="relative h-[320px] rounded-2xl overflow-hidden group">
                        {/* 渐变背景 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 via-brand-dark to-brand-dark" />
                        {/* 装饰光效 */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-orange/10 rounded-full blur-3xl" />

                        {/* 内容 */}
                        <div className="relative h-full flex items-center px-12">
                          {/* 左侧信息 */}
                          <div className="flex-1 z-10">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2.5 py-0.5 text-xs bg-brand-blue/20 text-brand-blue rounded-full">
                                官方精选
                              </span>
                              <span className="px-2.5 py-0.5 text-xs bg-white/5 text-brand-text-dim rounded-full">
                                {model.category}
                              </span>
                            </div>
                            <h3 className="text-2xl font-bold text-brand-text mb-2">{model.name}</h3>
                            <p className="text-brand-text-muted mb-4 max-w-md line-clamp-2">
                              {model.description || '官方精心打造的优质3D模型，品质保证'}
                            </p>
                            <div className="flex items-center gap-6">
                              <span className="text-3xl font-bold text-brand-orange">
                                ¥{formatPrice(model.base_price)}
                              </span>
                              <div className="flex items-center gap-3 text-xs text-brand-text-dim">
                                {model.weight && <span>约 {model.weight.toFixed(0)}g</span>}
                                <span>格式: {model.file_type?.toUpperCase()}</span>
                                <span>{model.view_count || 0} 次查看</span>
                              </div>
                            </div>
                          </div>

                          {/* 右侧展示图（模型缩略图） */}
                          <div className="w-64 h-64 shrink-0 relative">
                            <div className="absolute inset-0 bg-gradient-brand rounded-2xl opacity-20" />
                            <div className="flex items-center justify-center h-full p-4">
                              {model.glb_path ? (
                                <img
                                  src={`/uploads/thumbs/${model.glb_path.split('/').pop()?.replace('.glb', '.png') || ''}`}
                                  alt={model.name}
                                  className="w-full h-full object-contain drop-shadow-lg"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                    const parent = (e.target as HTMLImageElement).parentElement
                                    if (parent) {
                                      const icon = parent.querySelector('.carousel-fallback') as HTMLElement
                                      if (icon) icon.style.display = 'flex'
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className="carousel-fallback flex items-center justify-center"
                                style={{ display: model.glb_path ? 'none' : 'flex' }}
                              >
                                <Shield className="w-24 h-24 text-brand-blue/30" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 悬停提示 */}
                        <div className="absolute inset-0 bg-brand-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-6 py-2 bg-brand-blue text-white rounded-full text-sm font-medium">
                            查看详情
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 导航按钮 */}
              {officialModels.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-dark/80 border border-brand-border/50
                             flex items-center justify-center text-brand-text-dim hover:text-brand-text hover:bg-brand-dark transition-all backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-dark/80 border border-brand-border/50
                             flex items-center justify-center text-brand-text-dim hover:text-brand-text hover:bg-brand-dark transition-all backdrop-blur-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* 指示器 */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {officialModels.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === currentSlide
                            ? 'w-8 bg-brand-blue'
                            : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-brand-text-dim">暂无官方精选模型</div>
          )}
        </div>
      </section>

      {/* 社区模型市场 */}
      <section className="relative py-16 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-brand-orange rounded-full" />
              <h2 className="section-title">社区模型市场</h2>
              <TrendingUp className="w-5 h-5 text-brand-orange" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-brand-orange/15 text-brand-orange' : 'text-brand-text-dim hover:text-brand-text'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-brand-orange/15 text-brand-orange' : 'text-brand-text-dim hover:text-brand-text'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            {/* 筛选侧栏 */}
            <FilterSidebar
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              search={searchQuery}
              onSearchChange={handleSearchChange}
              onSearchSubmit={handleSearchSubmit}
              activeSort={activeSort}
              onSortChange={handleSortChange}
            />

            {/* 模型网格 + 右侧公告 */}
            <div className="flex-1 flex gap-6">
              {/* 模型列表 */}
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
                  </div>
                ) : (
                  <div className={`grid gap-5 ${
                    viewMode === 'grid'
                      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                      : 'grid-cols-1'
                  }`}>
                    {communityModels.map((model) => (
                      <Link key={model.id} to={`/model/${model.id}`}>
                        <ModelCard
                          id={model.id}
                          name={model.name}
                          price={formatPrice(model.base_price)}
                          category={model.category}
                          weight={model.weight}
                          fileType={model.file_type}
                          glbPath={model.glb_path}
                          viewCount={model.view_count}
                        />
                      </Link>
                    ))}
                  </div>
                )}

                {/* 加载更多 */}
                {!loading && communityModels.length > 0 && hasMoreCommunity && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={async () => {
                        if (loadingMore) return
                        setLoadingMore(true)
                        try {
                          const next = communityPage + 1
                          const res = await getModels({
                            community_only: true,
                            category: activeCategory || undefined,
                            search: searchQuery || undefined,
                            sort: activeSort || undefined,
                            page: next,
                            page_size: 6,
                          })
                          setCommunityModels(prev => [...prev, ...res.items])
                          setCommunityPage(next)
                          setHasMoreCommunity(res.items.length < res.total)
                        } catch {}
                        setLoadingMore(false)
                      }}
                      disabled={loadingMore}
                      className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      {loadingMore ? '加载中...' : '加载更多模型'}
                    </button>
                  </div>
                )}
              </div>

              {/* 右侧公告速览 */}
              {announcements.length > 0 && (
                <div className="w-64 shrink-0 hidden xl:block">
                  <div className="card-base p-4 sticky top-24">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-brand-orange" />
                        <h3 className="text-sm font-semibold text-brand-text">公告速览</h3>
                      </div>
                      <Link
                        to="/announcements"
                        className="text-xs text-brand-blue hover:text-brand-blue-light transition-colors"
                      >
                        更多
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {announcements.map((a, i) => (
                        <Link
                          key={a.id}
                          to={`/announcements/${a.id}`}
                          className="group flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                        >
                          <span className="w-5 h-5 rounded-full bg-gradient-brand shrink-0 flex items-center justify-center text-[10px] text-white font-bold">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-brand-text leading-relaxed line-clamp-2 group-hover:text-brand-orange transition-colors">
                              {a.title}
                            </p>
                            {a.published_at && (
                              <p className="text-[10px] text-brand-text-dim mt-0.5">
                                {a.published_at.split('T')[0]}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link
                      to="/announcements"
                      className="mt-3 flex items-center justify-center gap-1 text-xs text-brand-text-dim hover:text-brand-orange transition-colors py-2 border-t border-brand-border/50"
                    >
                      查看全部公告
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 上传CTA */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-glow-orange opacity-30" />

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-brand-text mb-4">
            有自己的<span className="text-brand-orange">3D模型</span>？
          </h2>
          <p className="text-brand-text-muted mb-8">
            上传你的模型到社区，让更多人看到你的创意作品，同时获得收益
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/user" className="btn-primary">
              上传模型
            </Link>
            <Link to="/official" className="btn-secondary">
              了解更多
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
