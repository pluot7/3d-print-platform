import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Eye, Pin, Loader2, ChevronRight } from 'lucide-react'
import { getAnnouncement, Announcement } from '../api/announcements'

export default function AnnouncementDetail() {
  const { id } = useParams<{ id: string }>()
  const [ann, setAnn] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      try {
        const data = await getAnnouncement(Number(id))
        setAnn(data)
      } catch {
        // 404 handled
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
      </div>
    )
  }

  if (!ann) {
    return (
      <div className="min-h-screen bg-brand-dark pt-24">
        <div className="max-w-3xl mx-auto px-4 text-center py-20">
          <p className="text-brand-text-dim">公告不存在</p>
          <Link to="/announcements" className="text-brand-blue hover:underline mt-4 inline-block">
            返回公告列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-sm text-brand-text-dim mb-6">
          <Link to="/" className="hover:text-brand-text transition-colors">首页</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/announcements" className="hover:text-brand-text transition-colors">公告</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-brand-text">{ann.title}</span>
        </div>

        {/* 返回 */}
        <Link
          to="/announcements"
          className="inline-flex items-center gap-1.5 text-sm text-brand-text-dim hover:text-brand-orange transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回公告列表
        </Link>

        {/* 标题 */}
        <div className="card-base p-8">
          <div className="flex items-center gap-2 mb-4">
            {ann.is_pinned && <Pin className="w-5 h-5 text-brand-orange fill-brand-orange/30" />}
            <h1 className="text-2xl font-bold text-brand-text">{ann.title}</h1>
          </div>

          {/* 元信息 */}
          <div className="flex items-center gap-4 text-sm text-brand-text-dim mb-8 pb-6 border-b border-brand-border/50">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {ann.published_at?.split('T')[0] || ann.created_at?.split('T')[0]}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {ann.view_count} 次阅读
            </span>
            <span>{ann.author}</span>
          </div>

          {/* 内容 */}
          <div className="prose prose-invert max-w-none text-brand-text/90 leading-relaxed whitespace-pre-wrap">
            {ann.content}
          </div>
        </div>
      </div>
    </div>
  )
}
