import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ArrowRight, Calendar, Eye, Pin, Loader2 } from 'lucide-react'
import { getAnnouncements, Announcement } from '../api/announcements'

export default function Announcements() {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getAnnouncements({ page_size: 50 })
        setList(res.items)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return (
    <div className="min-h-screen bg-brand-dark pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-brand-orange rounded-full" />
          <h1 className="section-title">公司公告</h1>
          <Bell className="w-5 h-5 text-brand-orange" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-20 text-center text-brand-text-dim">
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>暂无公告</p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((a) => (
              <Link
                key={a.id}
                to={`/announcements/${a.id}`}
                className="block card-base p-5 hover:bg-white/[0.03] transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {a.is_pinned && (
                        <Pin className="w-4 h-4 text-brand-orange fill-brand-orange/30" />
                      )}
                      <h2 className="text-base font-semibold text-brand-text group-hover:text-brand-orange transition-colors truncate">
                        {a.title}
                      </h2>
                    </div>
                    {a.summary && (
                      <p className="text-sm text-brand-text-muted line-clamp-2 mb-2">{a.summary}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-brand-text-dim">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {a.published_at?.split('T')[0] || a.created_at?.split('T')[0]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {a.view_count} 次阅读
                      </span>
                      <span>{a.author}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-brand-text-dim group-hover:text-brand-orange shrink-0 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
