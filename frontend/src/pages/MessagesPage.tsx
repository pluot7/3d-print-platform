import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell, MessageSquare, UserPlus, ShoppingBag, Mail, Users, Rss,
  ChevronRight, CheckCheck, Loader2, Megaphone, Send, ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getNotifications, markNotificationsRead, getConversations, getConversationMessages,
  sendMessage, getOrCreateConversation, getConversationsUnread,
  NotificationItem, ConversationItem, MessageItem,
} from '../api/notifications'
import { getUserFollowers, getUserFollowing, FollowItem } from '../api/notifications'

const typeIcons: Record<string, React.ReactNode> = {
  comment: <MessageSquare className="w-4 h-4" />,
  comment_reply: <MessageSquare className="w-4 h-4" />,
  discussion_reply: <MessageSquare className="w-4 h-4" />,
  follow: <UserPlus className="w-4 h-4" />,
  follow_activity: <Bell className="w-4 h-4" />,
  message: <Mail className="w-4 h-4" />,
  system: <Megaphone className="w-4 h-4" />,
  order_status: <ShoppingBag className="w-4 h-4" />,
}

const typeColors: Record<string, string> = {
  comment: 'bg-brand-blue/20 text-brand-blue',
  comment_reply: 'bg-brand-blue/20 text-brand-blue',
  discussion_reply: 'bg-brand-blue/20 text-brand-blue',
  follow: 'bg-emerald-400/20 text-emerald-400',
  follow_activity: 'bg-brand-orange/20 text-brand-orange',
  message: 'bg-purple-400/20 text-purple-400',
  system: 'bg-purple-400/20 text-purple-400',
  order_status: 'bg-amber-400/20 text-amber-400',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 172800000) return '昨天'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// ============ Tab 1: 通知列表 =============

function NotificationsTab() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (p: number, append = false) => {
    setLoading(true)
    try {
      const data = await getNotifications(p, 20)
      setNotifications(prev => append ? [...prev, ...data.items] : data.items)
      setUnreadCount(data.unread_count)
      setHasMore(p * 20 < data.total)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  // 进入通知页时刷新全局红点
  useEffect(() => { window.dispatchEvent(new CustomEvent('unread-refresh')) }, [])

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationsRead([id])
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) { console.error(e) }
  }

  const handleMarkAllRead = async () => {
    await markNotificationsRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    window.dispatchEvent(new CustomEvent('unread-refresh'))
  }

  const getLink = (n: NotificationItem): string | null => {
    if (n.type === 'order_status') return '/user'
    if (n.related_discussion_id) return `/community/${n.related_discussion_id}`
    if (n.related_model_id) return `/model/${n.related_model_id}`
    if (n.related_user_id && n.type === 'follow') return `/user/${n.related_user_id}`
    if (n.type === 'message') {
      // 如果有会话ID，跳转并自动打开该会话
      if (n.related_url) {
        // related_url 格式: /conversations/{convId}
        const convId = n.related_url.split('/').pop()
        if (convId) return `/messages?tab=conversations&open=${convId}`
      }
      return '/messages?tab=conversations'
    }
    return null
  }

  if (loading && notifications.length === 0) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-brand-text-dim animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-brand-text-dim">
          {unreadCount > 0 ? `你有 ${unreadCount} 条未读` : '全部已读'}
        </p>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-sm text-brand-blue hover:text-brand-blue/80">
            <CheckCheck className="w-3.5 h-3.5" />全部标为已读
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Bell className="w-12 h-12 text-brand-text-dim/30 mb-3" />
          <p className="text-sm text-brand-text-dim">暂无消息</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const linkTarget = getLink(n)
            const card = (
              <div
                key={n.id}
                className={`card-base p-3.5 transition-colors cursor-pointer ${
                  !n.is_read ? 'border-l-2 border-l-brand-orange bg-brand-orange/5' : 'hover:bg-white/5'
                }`}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeColors[n.type] || 'bg-white/10 text-brand-text-dim'}`}>
                    {typeIcons[n.type] || <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm ${n.is_read ? 'text-brand-text/70' : 'text-brand-text font-medium'}`}>{n.title}</h4>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0" />}
                    </div>
                    {n.content && <p className="text-xs text-brand-text-dim mt-0.5 line-clamp-2">{n.content}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-brand-text-dim/60">{formatTime(n.created_at)}</span>
                      {linkTarget && <span className="text-xs text-brand-blue flex items-center gap-0.5">查看 <ChevronRight className="w-3 h-3" /></span>}
                    </div>
                  </div>
                </div>
              </div>
            )
            return linkTarget ? <Link key={n.id} to={linkTarget}>{card}</Link> : card
          })}
          {hasMore && (
            <div className="text-center pt-3">
              <button onClick={() => { setPage(p => p+1); load(page+1, true) }} disabled={loading}
                className="text-sm text-brand-blue hover:text-brand-blue/80 disabled:opacity-50">
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============ Tab 2: 私信会话列表 =============

function ConversationsTab({ initialConvId }: { initialConvId?: number | null }) {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [text, setText] = useState('')
  const [convUnreadCount, setConvUnreadCount] = useState(0)

  const refreshUnread = useCallback(() => {
    getConversationsUnread().then(u => setConvUnreadCount(u.count)).catch(() => {})
  }, [])

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('3dprint_token')
      const headers: Record<string,string> = { Authorization: `Bearer ${token}` }
      await fetch('/api/conversations/read-all', { method: 'PUT', headers })
      setConvUnreadCount(0)
      setConversations(prev => prev.map(c => ({ ...c, unread_count: 0 })))
      // 触发全局红点刷新事件
      window.dispatchEvent(new CustomEvent('unread-refresh'))
    } catch (e) { console.error(e) }
  }

  const loadConvs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getConversations()
      setConversations(data.items)
      const totalUnread = data.items.reduce((s, c) => s + c.unread_count, 0)
      setConvUnreadCount(totalUnread)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConvs() }, [loadConvs])

  // 进入对话页时刷新全局红点
  useEffect(() => { window.dispatchEvent(new CustomEvent('unread-refresh')) }, [])

  // 如果有初始会话 ID，在加载列表后自动打开该会话
  useEffect(() => {
    if (initialConvId && conversations.length > 0) {
      const target = conversations.find(c => c.id === initialConvId)
      if (target) {
        openConversation(target)
      }
    }
  }, [conversations, initialConvId])

  const openConversation = async (conv: ConversationItem) => {
    setSelectedConv(conv)
    setMsgLoading(true)
    try {
      const data = await getConversationMessages(conv.id)
      setMessages(data.items)
    } catch (e) { console.error(e) } finally { setMsgLoading(false) }
  }

  const sendMsg = async () => {
    if (!text.trim() || !selectedConv) return
    const content = text.trim()
    setText('')
    try {
      const msg = await sendMessage(selectedConv.other_user.id, content)
      setMessages(prev => [...prev, msg])
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id ? { ...c, last_message: content, unread_count: 0 } : c
      ))
    } catch (e) {
      console.error(e)
      setText(content)
    }
  }

  if (selectedConv) {
    return (
      <div className="flex flex-col h-[60vh]">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-brand-border">
          <button onClick={() => setSelectedConv(null)} className="p-1 text-brand-text-muted hover:text-brand-text">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link to={`/user/${selectedConv.other_user.id}`} className="flex items-center gap-2.5 font-medium text-brand-text hover:text-brand-blue">
            <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {selectedConv.other_user.avatar_url ? (
                <img src={selectedConv.other_user.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : selectedConv.other_user.username.charAt(0).toUpperCase()}
            </div>
            {selectedConv.other_user.username}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
          {msgLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-text-dim" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-brand-text-dim py-8">开始对话吧</div>
          ) : (
            messages.map(m => {
              const isMe = m.sender_id === currentUser?.id
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3.5 py-2 rounded-xl text-sm ${
                    isMe ? 'bg-brand-blue text-white rounded-tr-sm' : 'bg-brand-panel text-brand-text rounded-tl-sm'
                  }`}>
                    {m.content}
                    <div className={`text-[10px] mt-0.5 ${isMe ? 'text-white/60' : 'text-brand-text-dim/60'}`}>
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
            placeholder="输入消息..."
            className="flex-1 input-base text-sm"
          />
          <button onClick={sendMsg} disabled={!text.trim()}
            className="btn-primary !px-3 disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-brand-text-dim animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-brand-text-dim">
          {convUnreadCount > 0 ? `有 ${convUnreadCount} 条未读私信` : '全部已读'}
        </p>
        {convUnreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-sm text-brand-blue hover:text-brand-blue/80">
            <CheckCheck className="w-3.5 h-3.5" />全部标为已读
          </button>
        )}
      </div>
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Mail className="w-12 h-12 text-brand-text-dim/30 mb-3" />
          <p className="text-sm text-brand-text-dim">没有私信</p>
          <p className="text-xs text-brand-text-dim/60 mt-1">去用户主页点击「发私信」开始对话</p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => openConversation(conv)}
              className="card-base p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
              <Link to={`/user/${conv.other_user.id}`} className="shrink-0" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                  {conv.other_user.avatar_url ? (
                    <img src={conv.other_user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : conv.other_user.username.charAt(0).toUpperCase()}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-text">{conv.other_user.username}</span>
                  {conv.unread_count > 0 && (
                    <span className="bg-brand-orange text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="text-xs text-brand-text-dim/70 truncate mt-0.5">{conv.last_message}</p>
                )}
                {conv.last_message_at && (
                  <span className="text-[10px] text-brand-text-dim/40">{formatTime(conv.last_message_at)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Tab 3: 关注/粉丝列表 =============

function FollowsTab() {
  const { user: currentUser } = useAuth()
  const [subTab, setSubTab] = useState<'following' | 'followers'>('following')
  const [following, setFollowing] = useState<FollowItem[]>([])
  const [followers, setFollowers] = useState<FollowItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    Promise.all([
      getUserFollowing(currentUser.id),
      getUserFollowers(currentUser.id),
    ]).then(([fing, fers]) => {
      setFollowing(fing.items)
      setFollowers(fers.items)
    }).catch(console.error).finally(() => setLoading(false))
  }, [currentUser])

  const items = subTab === 'following' ? following : followers

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-brand-border">
        {(['following', 'followers'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              subTab === t ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-brand-text-dim hover:text-brand-text'
            }`}>
            {t === 'following' ? '关注' : '粉丝'}
            <span className="ml-1.5 text-xs opacity-60">
              {t === 'following' ? following.length : followers.length}
            </span>
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-text-dim" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-12">
          <Users className="w-12 h-12 text-brand-text-dim/30 mb-3" />
          <p className="text-sm text-brand-text-dim">{subTab === 'following' ? '还没有关注任何人' : '还没有粉丝'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Link key={item.id} to={`/user/${item.user.id}`}
              className="card-base p-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                {item.user.avatar_url ? (
                  <img src={item.user.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : item.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text">{item.user.username}</p>
                {item.user.full_name && <p className="text-xs text-brand-text-dim">{item.user.full_name}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-brand-text-dim/40" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ 主页面 =============

export default function MessagesPage() {
  const { isAuthenticated } = useAuth()
  const [tab, setTab] = useState<'notifications' | 'conversations' | 'follows'>('notifications')
  const [convUnread, setConvUnread] = useState(0)
  const [searchParams] = useSearchParams()
  const [initialConvId, setInitialConvId] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    getConversationsUnread().then(r => setConvUnread(r.count)).catch(() => {})
  }, [isAuthenticated])

  // 从 URL 参数切换 tab 并读取要打开的会话 ID
  useEffect(() => {
    const t = searchParams.get('tab')
    const openId = searchParams.get('open')
    if (t === 'conversations') setTab('conversations')
    if (openId) setInitialConvId(parseInt(openId))
  }, [searchParams])

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Bell className="w-16 h-16 text-brand-text-dim/30 mb-4" />
        <p className="text-brand-text-dim">请先登录</p>
        <Link to="/login" className="btn-primary mt-4">去登录</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-brand-text mb-5">消息中心</h1>

      {/* 顶部 Tab */}
      <div className="flex gap-1 mb-6 border-b border-brand-border">
        <button onClick={() => setTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'notifications' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-brand-text-dim hover:text-brand-text'
          }`}>
          <Bell className="w-4 h-4" />通知
        </button>
        <button onClick={() => setTab('conversations')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'conversations' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-brand-text-dim hover:text-brand-text'
          }`}>
          <Mail className="w-4 h-4" />私信
          {convUnread > 0 && (
            <span className="bg-brand-orange text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {convUnread > 99 ? '99+' : convUnread}
            </span>
          )}
        </button>
        <button onClick={() => setTab('follows')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'follows' ? 'text-brand-orange border-b-2 border-brand-orange' : 'text-brand-text-dim hover:text-brand-text'
          }`}>
          <Users className="w-4 h-4" />关注·粉丝
        </button>
      </div>

      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'conversations' && <ConversationsTab initialConvId={initialConvId} />}
      {tab === 'follows' && <FollowsTab />}
    </div>
  )
}
