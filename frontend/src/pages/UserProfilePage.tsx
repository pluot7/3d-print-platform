import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { UserPlus, UserMinus, Loader2, MessageSquare, Printer, Users, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserProfile, getActivities, followUser, unfollowUser, getFullAvatarUrl,
  UserProfileResponse, ActivityItem, getOrCreateConversation,
} from '../api/notifications'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  const userId = parseInt(id || '0')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.all([
      getUserProfile(userId),
      getActivities(userId),
    ]).then(([p, a]) => {
      setProfile(p)
      setActivities(a.items)
    }).catch(console.error).finally(() => setLoading(false))
  }, [userId])

  const handleFollow = async () => {
    if (!profile || followLoading) return
    setFollowLoading(true)
    try {
      if (profile.is_following) {
        await unfollowUser(profile.id)
        setProfile({ ...profile, is_following: false, follower_count: profile.follower_count - 1 })
      } else {
        await followUser(profile.id)
        setProfile({ ...profile, is_following: true, follower_count: profile.follower_count + 1 })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-text-dim animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-brand-text-dim">用户不存在</p>
        <Link to="/" className="text-brand-blue text-sm mt-4">返回首页</Link>
      </div>
    )
  }

  const isSelf = currentUser?.id === profile.id

  return (
    <div className="max-w-3xl mx-auto">
      {/* 用户信息卡片 */}
      <div className="card-base p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-brand flex items-center justify-center shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={getFullAvatarUrl(profile.avatar_url)}
                className="w-full h-full object-cover"
                alt={profile.username}
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-brand-text">{profile.username}</h1>
              {!isSelf && isAuthenticated && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      profile.is_following
                        ? 'bg-brand-panel border border-brand-border text-brand-text-muted hover:border-red-400/50 hover:text-red-400'
                        : 'bg-brand-blue text-white hover:bg-brand-blue/90'
                    }`}
                  >
                    {followLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profile.is_following ? (
                      <><UserMinus className="w-4 h-4" /> 已关注</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> 关注</>
                    )}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const { conversation_id } = await getOrCreateConversation(profile.id)
                        window.location.href = `/messages?tab=conversations&open=${conversation_id}`
                      } catch (e) {
                        alert('创建会话失败: ' + (e instanceof Error ? e.message : '未知错误'))
                        console.error(e)
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium
                             bg-brand-panel border border-brand-border text-brand-text-muted
                             hover:text-brand-blue hover:border-brand-blue/50 transition-all"
                  >
                    <Mail className="w-4 h-4" /> 发私信
                  </button>
                </div>
              )}
            </div>
            {profile.full_name && (
              <p className="text-sm text-brand-text-dim mt-0.5">{profile.full_name}</p>
            )}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-brand-border">
          <div className="text-center">
            <div className="text-lg font-bold text-brand-text">{profile.follower_count}</div>
            <div className="text-xs text-brand-text-dim">粉丝</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-text">{profile.following_count}</div>
            <div className="text-xs text-brand-text-dim">关注</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-text">{profile.discussion_count}</div>
            <div className="text-xs text-brand-text-dim">帖子</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-text">{profile.model_count}</div>
            <div className="text-xs text-brand-text-dim">模型</div>
          </div>
        </div>
      </div>

      {/* 动态时间线 */}
      <div className="mt-6">
        <h2 className="text-base font-semibold text-brand-text mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-orange rounded-full" />
          最近的动态
        </h2>

        {activities.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-brand-text-dim">暂无动态</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(a => {
              const link = a.discussion_id ? `/community/${a.discussion_id}` : a.model_id ? `/model/${a.model_id}` : null
              const content = (
                <div className="card-base p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      a.type === 'new_discussion' ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-orange/20 text-brand-orange'
                    }`}>
                      {a.type === 'new_discussion' ? <MessageSquare className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm text-brand-text font-medium">{a.title}</h4>
                      {a.content_preview && <p className="text-xs text-brand-text-dim mt-1 line-clamp-2">{a.content_preview}</p>}
                      <span className="text-xs text-brand-text-dim/60 mt-1 block">{formatTime(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
              return link ? <Link key={a.id} to={link}>{content}</Link> : <div key={a.id}>{content}</div>
            })}
          </div>
        )}
      </div>
    </div>
  )
}
