import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Eye, MessageCircle, Pin, Lock, Loader2,
  Send, Trash2, AlertCircle, Shield, FlagIcon, Reply as ReplyIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ReportModal from '../components/ReportModal'
import {
  getDiscussion, getReplies, createReply, deleteDiscussion, deleteReply,
  updateDiscussion, getAvatarUrl, categoryNames, categoryColors,
  DiscussionResponse, ReplyResponse,
} from '../api/discussions'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isAdmin(role?: string) {
  return role === 'admin' || role === 'super_admin'
}

export default function DiscussionDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [discussion, setDiscussion] = useState<DiscussionResponse | null>(null)
  const [replies, setReplies] = useState<ReplyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // 回复子回复
  const [replyingTo, setReplyingTo] = useState<ReplyResponse | null>(null)
  const [submittingChild, setSubmittingChild] = useState(false)
  const [reportOpen, setReportOpen] = useState<{ type: 'discussion' | 'reply'; id: number; label?: string } | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'discussion' | 'reply', id: number
  } | null>(null)

  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminPinned, setAdminPinned] = useState(false)
  const [adminLocked, setAdminLocked] = useState(false)

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [d, r] = await Promise.all([
        getDiscussion(parseInt(id)),
        getReplies(parseInt(id)),
      ])
      setDiscussion(d)
      setReplies(r.items)
      setAdminPinned(d.is_pinned)
      setAdminLocked(d.is_locked)
    } catch (e: any) {
      setError(e.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  // 回复子回复
  const handleChildReply = async (parentId: number) => {
    if (!replyContent.trim()) return
    setSubmittingChild(true)
    try {
      const r = await createReply(parseInt(id!), replyContent.trim(), parentId)
      // 在顶级回复中查找 parentId，若未找到则遍历子回复找到其所属的顶级回复
      setReplies(prev => {
        let found = false
        const updated = prev.map(top => {
          if (top.id === parentId) {
            found = true
            return { ...top, replies: [...(top.replies || []), r] }
          }
          return top
        })
        if (!found) {
          // parentId 是子回复的 id，找到该子回复所属的顶级回复
          return updated.map(top => {
            const hasChild = (top.replies || []).some(sub => sub.id === parentId)
            if (hasChild) {
              return { ...top, replies: [...(top.replies || []), r] }
            }
            return top
          })
        }
        return updated
      })
      setReplyContent('')
      setReplyingTo(null)
    } catch (e: any) {
      console.error(e)
    } finally {
      setSubmittingChild(false)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const r = await createReply(parseInt(id!), replyContent.trim())
      setReplies(prev => [...prev, r])
      setReplyContent('')
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail || '回复失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      if (confirmDelete.type === 'discussion') {
        await deleteDiscussion(confirmDelete.id)
        navigate('/community')
      } else {
        await deleteReply(confirmDelete.id)
        setReplies(prev => {
          let found = false
          const updated = prev.filter(r => {
            if (r.id === confirmDelete.id) { found = true; return false }
            return true
          })
          if (!found) {
            // 子回复被删除，从顶级回复的嵌套列表中移除
            return updated.map(top => ({
              ...top,
              replies: (top.replies || []).filter(r => r.id !== confirmDelete.id),
            }))
          }
          return updated
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleAdminUpdate = async () => {
    if (!discussion) return
    try {
      const d = await updateDiscussion(discussion.id, {
        is_pinned: adminPinned,
        is_locked: adminLocked,
      })
      setDiscussion(d)
      setShowAdminPanel(false)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
      </div>
    )
  }

  if (error || !discussion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-brand-text-dim">{error || '帖子不存在'}</p>
        <Link to="/community" className="text-brand-orange text-sm mt-4 inline-block hover:underline">
          ← 返回讨论区
        </Link>
      </div>
    )
  }

  const canDeleteDiscussion = isAdmin(user?.role) || user?.id === discussion.user_id
  const canDeleteReply = (r: ReplyResponse) => isAdmin(user?.role) || user?.id === r.user_id

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/community')}
          className="flex items-center gap-1.5 text-brand-text-dim hover:text-brand-text text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回讨论区
        </button>

        {/* 管理员面板 */}
        {isAdmin(user?.role) && (
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 text-violet-400
                       border border-violet-500/30 rounded-lg text-sm hover:bg-violet-500/20 transition-colors"
          >
            <Shield className="w-4 h-4" />
            管理
          </button>
        )}
      </div>

      {/* 管理员工具栏 */}
      {showAdminPanel && isAdmin(user?.role) && (
        <div className="card-base p-4 mb-4 border-violet-500/30">
          <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> 管理员控制
          </h3>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
              <input
                type="checkbox"
                checked={adminPinned}
                onChange={e => setAdminPinned(e.target.checked)}
                className="accent-brand-orange"
              />
              置顶帖子
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
              <input
                type="checkbox"
                checked={adminLocked}
                onChange={e => setAdminLocked(e.target.checked)}
                className="accent-brand-orange"
              />
              锁定帖子（禁止回复）
            </label>
            <button
              onClick={handleAdminUpdate}
              className="px-4 py-1.5 bg-violet-500 text-white rounded-lg text-sm
                         hover:bg-violet-600 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* 帖子正文 */}
      <div className="card-base p-6 mb-6">
        {/* 标签 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {discussion.is_pinned && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-orange/15
                             text-brand-orange text-xs rounded border border-brand-orange/30">
              <Pin className="w-3 h-3" />置顶
            </span>
          )}
          {discussion.is_locked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-panel
                             text-brand-text-dim text-xs rounded border border-brand-border">
              <Lock className="w-3 h-3" />已锁定
            </span>
          )}
          <span className={`px-2 py-0.5 text-xs rounded border ${categoryColors[discussion.category]}`}>
            {categoryNames[discussion.category]}
          </span>
        </div>

        {/* 标题 */}
        <h1 className="text-xl font-bold text-brand-text mb-4">{discussion.title}</h1>

        {/* 作者信息 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link to={`/user/${discussion.author.id}`}>
              <img
                src={getAvatarUrl(discussion.author)}
                alt={discussion.author.username}
                className="w-10 h-10 rounded-full bg-brand-panel hover:opacity-80 transition-opacity"
              />
            </Link>
            <div>
              <Link to={`/user/${discussion.author.id}`} className="text-sm font-medium text-brand-text hover:text-brand-blue transition-colors">
                {discussion.author.username}
              </Link>
              <p className="text-xs text-brand-text-dim">{formatTime(discussion.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-brand-text-dim">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{discussion.view_count}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{discussion.reply_count}</span>
          </div>
        </div>

        {/* 内容 */}
        <div className="prose-invert prose-sm max-w-none text-brand-text/90
                        border-t border-brand-border pt-4 whitespace-pre-wrap leading-relaxed">
          {discussion.content}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-border">
          <button
            onClick={() => setReportOpen({ type: 'discussion', id: discussion.id, label: discussion.title?.slice(0, 30) })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-brand-text-dim text-sm
                       hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <FlagIcon className="w-4 h-4" />
            举报
          </button>
          <div className="flex gap-1">
            {canDeleteDiscussion && (
              <button
                onClick={() => setConfirmDelete({ type: 'discussion', id: discussion.id })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 text-sm
                           hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                删除主题
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 回复列表 */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-brand-text mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-brand-orange" />
          {replies.length} 条回复
        </h2>

        {replies.length === 0 ? (
          <div className="card-base p-8 text-center text-brand-text-dim text-sm">
            暂无回复，来抢沙发吧！
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((r, idx) => (
              <ReplyItem
                key={r.id}
                reply={r}
                idx={idx}
                discussionUserId={discussion.user_id}
                user={user}
                isAuthenticated={isAuthenticated}
                canDeleteReply={canDeleteReply}
                replyingTo={replyingTo}
                replyContent={replyContent}
                submittingChild={submittingChild}
                onReplyClick={(rep) => {
                  if (replyingTo?.id === rep.id) {
                    setReplyingTo(null)
                  } else {
                    setReplyingTo(rep)
                    setReplyContent('')
                  }
                }}
                onReplyTextChange={setReplyContent}
                onReplySubmit={handleChildReply}
                onReport={(rep) => setReportOpen({ type: 'reply', id: rep.id, label: rep.content?.slice(0, 30) })}
                onDelete={(rep) => setConfirmDelete({ type: 'reply', id: rep.id })}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>

      {/* 回复框 */}
      {!discussion.is_locked ? (
        <div className="card-base p-4">
          {isAuthenticated ? (
            <>
              {submitError && (
                <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg
                                flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}
              <div className="flex gap-3">
                {replyingTo ? (
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-sm text-brand-text-dim">
                      <ReplyIcon className="w-3.5 h-3.5" />
                      回复 <span className="text-brand-blue">@{replyingTo.author.username}</span>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyContent('') }}
                        className="ml-auto text-xs text-brand-orange hover:underline"
                      >
                        取消回复
                      </button>
                    </div>
                    <textarea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      rows={2}
                      placeholder={`回复 @${replyingTo.author.username}...`}
                      className="w-full px-3 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                                 text-sm text-brand-text placeholder:text-brand-text-dim
                                 focus:outline-none focus:border-brand-blue transition-colors resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleChildReply(replyingTo.id)}
                        disabled={submittingChild || !replyContent.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg
                                   text-sm hover:bg-brand-orange/90 transition-colors disabled:opacity-50"
                      >
                        {submittingChild ? '发送中...' : <><Send className="w-3 h-3" /> 回复</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link to={`/user/${user!.id}`}>
                      <img
                        src={getAvatarUrl({
                          id: user!.id,
                          username: user!.username,
                          full_name: user!.fullName || null,
                          avatar_url: user!.avatar || null,
                        })}
                        alt={user!.username}
                        className="w-8 h-8 rounded-full shrink-0 bg-brand-panel mt-1 hover:opacity-80 transition-opacity"
                      />
                    </Link>
                    <div className="flex-1">
                      <textarea
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        rows={3}
                        placeholder="写下你的回复..."
                        className="w-full px-3 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                                   text-sm text-brand-text placeholder:text-brand-text-dim
                                   focus:outline-none focus:border-brand-blue transition-colors resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleReply}
                          disabled={submitting || !replyContent.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg
                                     text-sm hover:bg-brand-orange/90 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {submitting ? '发送中...' : '发送回复'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-brand-text-dim text-center">
              <Link to="/login" className="text-brand-orange hover:underline">登录</Link>
              后才能回复
            </p>
          )}
        </div>
      ) : (
        <div className="card-base p-4 text-center">
          <Lock className="w-5 h-5 text-brand-text-dim mx-auto mb-2" />
          <p className="text-sm text-brand-text-dim">该主题已锁定，无法回复</p>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setConfirmDelete(null)}>
          <div className="card-base w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-text mb-2">确认删除</h3>
            <p className="text-sm text-brand-text-dim mb-5">
              {confirmDelete.type === 'discussion'
                ? '确定要删除这条主题帖吗？所有回帖也会一并删除，此操作不可撤销。'
                : '确定要删除这条回复吗？此操作不可撤销。'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                      className="px-4 py-2 bg-brand-panel border border-brand-border rounded-lg
                                 text-sm text-brand-text hover:border-brand-border/80">
                取消
              </button>
              <button onClick={handleDelete}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm
                                 hover:bg-red-600 transition-colors">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 举报弹窗 */}
      {reportOpen && (
        <ReportModal
          open={true}
          onClose={() => setReportOpen(null)}
          targetType={reportOpen.type === 'discussion' ? 'discussion' : 'reply'}
          targetId={reportOpen.id}
          targetLabel={reportOpen.label}
        />
      )}
    </div>
  )
}

// ============ 子组件：单条回复（支持嵌套子回复） ============

function ReplyItem({
  reply, idx, discussionUserId, user, isAuthenticated,
  canDeleteReply, replyingTo, replyContent, submittingChild,
  onReplyClick, onReplyTextChange, onReplySubmit,
  onReport, onDelete, formatTime,
}: {
  reply: ReplyResponse
  idx?: number
  discussionUserId: number
  user: any
  isAuthenticated: boolean
  canDeleteReply: (r: ReplyResponse) => boolean
  replyingTo: ReplyResponse | null
  replyContent: string
  submittingChild: boolean
  onReplyClick: (r: ReplyResponse) => void
  onReplyTextChange: (v: string) => void
  onReplySubmit: (parentId: number) => Promise<void>
  onReport: (r: ReplyResponse) => void
  onDelete: (r: ReplyResponse) => void
  formatTime: (iso: string) => string
}) {
  const isReplying = replyingTo?.id === reply.id

  return (
    <div className="card-base p-4">
      <div className="flex items-start gap-3">
        <Link to={`/user/${reply.author.id}`}>
          <img
            src={getAvatarUrl(reply.author)}
            alt={reply.author.username}
            className="w-8 h-8 rounded-full shrink-0 bg-brand-panel mt-0.5 hover:opacity-80 transition-opacity"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/user/${reply.author.id}`} className="text-sm font-medium text-brand-text hover:text-brand-blue transition-colors">
                {reply.author.username}
              </Link>
              {reply.reply_to_author && (
                <span className="text-xs text-brand-text-dim">
                  回复 <span className="text-brand-blue">@{reply.reply_to_author.username}</span>
                </span>
              )}
              {idx === 0 && (
                <span className="px-1.5 py-0.5 bg-brand-orange/15 text-brand-orange text-xs rounded">沙发</span>
              )}
              {reply.author.id === discussionUserId && (
                <span className="px-1.5 py-0.5 bg-brand-blue/15 text-brand-blue text-xs rounded">楼主</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-brand-text-dim">{formatTime(reply.created_at)}</span>
              <button
                onClick={() => onReplyClick(reply)}
                className="p-1 text-brand-text-dim hover:text-brand-orange transition-colors"
                title="回复"
              >
                <ReplyIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onReport(reply)}
                className="p-1 text-brand-text-dim hover:text-red-400 transition-colors"
                title="举报"
              >
                <FlagIcon className="w-3.5 h-3.5" />
              </button>
              {canDeleteReply(reply) && (
                <button
                  onClick={() => onDelete(reply)}
                  className="p-1 text-brand-text-dim hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-brand-text/80 whitespace-pre-wrap leading-relaxed">
            {reply.content}
          </p>

          {/* 回复输入框（在该回复下展开） */}
          {isReplying && (
            <div className="mt-3 pl-3 border-l-2 border-brand-orange/30">
              <textarea
                value={replyContent}
                onChange={e => onReplyTextChange(e.target.value)}
                rows={2}
                placeholder={`回复 @${reply.author.username}...`}
                className="w-full px-3 py-2 bg-brand-panel border border-brand-border rounded-lg
                           text-sm text-brand-text placeholder:text-brand-text-dim
                           focus:outline-none focus:border-brand-blue transition-colors resize-none"
              />
              <div className="flex justify-end gap-2 mt-1.5">
                <button
                  onClick={() => { onReplyTextChange(''); onReplyClick(reply) }}
                  className="px-3 py-1 text-xs text-brand-text-dim hover:text-brand-text transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => onReplySubmit(reply.id)}
                  disabled={submittingChild || !replyContent.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-brand-orange text-white rounded-md
                             text-xs hover:bg-brand-orange/90 transition-colors disabled:opacity-50"
                >
                  {submittingChild ? '发送中...' : <><Send className="w-3 h-3" /> 回复</>}
                </button>
              </div>
            </div>
          )}

          {/* 子回复列表 */}
          {reply.replies && reply.replies.length > 0 && (
            <div className="mt-3 space-y-2 ml-4 pl-3 border-l-2 border-brand-border/30">
              {reply.replies.map(child => (
                <ReplyItem
                  key={child.id}
                  reply={child}
                  discussionUserId={discussionUserId}
                  user={user}
                  isAuthenticated={isAuthenticated}
                  canDeleteReply={canDeleteReply}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  submittingChild={submittingChild}
                  onReplyClick={onReplyClick}
                  onReplyTextChange={onReplyTextChange}
                  onReplySubmit={onReplySubmit}
                  onReport={onReport}
                  onDelete={onDelete}
                  formatTime={formatTime}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
