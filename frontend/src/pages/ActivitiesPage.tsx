import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Printer, Loader2, Rss } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getActivities, getFullAvatarUrl, ActivityItem } from '../api/notifications'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function ActivityCard({ a }: { a: ActivityItem }) {
  const link = a.discussion_id ? `/community/${a.discussion_id}` : a.model_id ? `/model/${a.model_id}` : null

  const content = (
    <div className="card-base p-4 hover:bg-white/5 transition-colors cursor-pointer">
      <div className="flex items-start gap-3">
        <Link to={`/user/${a.user_id}`} className="shrink-0" onClick={e => e.stopPropagation()}>
          <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center overflow-hidden">
            {getFullAvatarUrl(a.avatar_url) ? (
              <img src={getFullAvatarUrl(a.avatar_url)} className="w-full h-full object-cover" alt={a.username} />
            ) : (
              <span className="text-sm font-bold text-white">{a.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/user/${a.user_id}`} className="text-xs font-medium text-brand-blue hover:text-brand-blue/80" onClick={e => e.stopPropagation()}>
              {a.username}
            </Link>
            <span className="text-xs text-brand-text-dim/40">·</span>
            <span className="text-xs text-brand-text-dim/60">{formatTime(a.created_at)}</span>
          </div>
          <h4 className="text-sm text-brand-text font-medium mt-0.5">{a.title}</h4>
          {a.content_preview && (
            <p className="text-xs text-brand-text-dim mt-1 line-clamp-2">{a.content_preview}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-brand-text-dim/60">
              {a.type === 'new_discussion' ? '发布帖子' : '上传模型'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  if (link) {
    return <div onClick={() => window.location.href = link} className="cursor-pointer">{content}</div>
  }
  return content
}

export default function ActivitiesPage() {
  const { isAuthenticated } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (p: number, append = false) => {
    setLoading(true)
    try {
      const data = await getActivities(undefined, p)
      setActivities(prev => append ? [...prev, ...data.items] : data.items)
      setHasMore(p * 20 < data.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(1)
  }, [load])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    load(next, true)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-text">动态广场</h1>
        <p className="text-sm text-brand-text-dim mt-1">查看所有用户的最新发布和动态</p>
      </div>

      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-text-dim animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Rss className="w-16 h-16 text-brand-text-dim/30 mb-4" />
          <p className="text-brand-text-dim">暂无动态</p>
          <p className="text-xs text-brand-text-dim/50 mt-1">有新帖子和新模型时动态会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(a => (
            <ActivityCard key={a.id} a={a} />
          ))}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="text-sm text-brand-blue hover:text-brand-blue/80 transition-colors disabled:opacity-50"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
