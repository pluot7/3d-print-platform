import { useState } from 'react'
import { AlertCircle, Loader2, CheckCircle, X } from 'lucide-react'
import { createReport, ReportTargetType, reportReasons } from '../api/reports'

interface ReportModalProps {
  open: boolean
  onClose: () => void
  targetType: ReportTargetType
  targetId: number
  targetLabel?: string
}

export default function ReportModal({ open, onClose, targetType, targetId, targetLabel }: ReportModalProps) {
  const [reason, setReason] = useState('spam')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const typeLabels: Record<ReportTargetType, string> = {
    model: '模型',
    discussion: '帖子',
    reply: '回帖',
    comment: '评论',
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        detail: detail || undefined,
      })
      setDone(true)
    } catch (e: any) {
      const msg = e?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : '提交失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-brand-panel border border-brand-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-brand-text font-semibold mb-1">举报已提交</h3>
            <p className="text-sm text-brand-text-dim mb-4">管理员会尽快处理，感谢你的反馈</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand-orange text-white rounded-lg text-sm hover:bg-brand-orange/90 transition-colors"
            >
              关闭
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-brand-orange" />
                <h3 className="text-base font-semibold text-brand-text">举报{targetLabel ? `「${targetLabel}」` : typeLabels[targetType]}</h3>
              </div>
              <button onClick={onClose} className="text-brand-text-dim hover:text-brand-text p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-brand-text-dim mb-1.5">举报原因</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-orange/50"
                >
                  {Object.entries(reportReasons).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-brand-text-dim mb-1.5">补充说明（可选）</label>
                <textarea
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  placeholder="请描述具体情况..."
                  maxLength={500}
                  rows={3}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim/30 focus:outline-none focus:border-brand-orange/50 resize-none"
                />
                <div className="text-right text-xs text-brand-text-dim mt-1">{detail.length}/500</div>
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-2.5 bg-brand-orange text-white rounded-lg text-sm font-medium
                         hover:bg-brand-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? '提交中...' : '提交举报'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
