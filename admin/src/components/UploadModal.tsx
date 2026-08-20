import { useState, useRef } from 'react'
import { Box, Upload, X, Loader2, DollarSign } from 'lucide-react'
import { uploadModel } from '../api/models'

const categories = [
  { value: 'figure', label: '手办人物' },
  { value: 'mechanical', label: '机械零件' },
  { value: 'architectural', label: '建筑模型' },
  { value: 'art', label: '艺术摆件' },
  { value: 'other', label: '其他' },
]

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // 打开文件选择器
  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  // 选择文件后
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // 自动填充名称（取文件名，去掉扩展名）
      if (!form.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setForm(prev => ({ ...prev, name: nameWithoutExt }))
      }
    }
  }

  // 移除文件
  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 提交上传
  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('请选择模型文件')
      return
    }
    if (!form.name.trim()) {
      setError('请输入模型名称')
      return
    }

    try {
      setUploading(true)
      setError('')
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('name', form.name)
      formData.append('description', form.description)
      formData.append('category', form.category)

      await uploadModel(formData)
      handleClose()
      onSuccess()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'object') {
        const msgs = Object.entries(detail)
          .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
          .join('; ')
        setError(msgs)
      } else {
        setError(detail || '上传失败，请重试')
      }
    } finally {
      setUploading(false)
    }
  }

  // 关闭弹窗，重置状态
  const handleClose = () => {
    setSelectedFile(null)
    setForm({ name: '', description: '', category: 'other' })
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-base p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-brand-text">上传模型</h3>
          <button onClick={handleClose} className="text-brand-text-dim hover:text-brand-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* 步骤1: 选择文件 — 始终可见 */}
        <div className="mb-4">
          <label className="text-sm text-brand-text-dim block mb-2">① 选择模型文件</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl,.obj,.3mf,.step,.stp"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            /* 已选文件 — 显示文件信息 */
            <div className="border border-brand-blue/40 bg-brand-blue/5 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center shrink-0">
                  <Box className="w-6 h-6 text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{selectedFile.name}</p>
                  <p className="text-xs text-brand-text-dim mt-0.5">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  onClick={removeFile}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-400/10 transition-colors"
                >
                  移除
                </button>
              </div>
              <button
                onClick={openFileDialog}
                className="mt-3 w-full py-2 text-xs text-brand-blue border border-brand-blue/30 rounded-lg
                         hover:bg-brand-blue/10 transition-colors"
              >
                重新选择文件
              </button>
            </div>
          ) : (
            /* 未选文件 — 大按钮直接打开文件选择器 */
            <button
              onClick={openFileDialog}
              className="w-full border-2 border-dashed border-brand-border rounded-xl p-8
                       hover:border-brand-blue hover:bg-brand-blue/5 transition-all group cursor-pointer"
            >
              <Upload className="w-10 h-10 text-brand-text-dim mx-auto mb-3 group-hover:text-brand-blue transition-colors" />
              <p className="text-sm text-brand-text group-hover:text-brand-blue transition-colors">点击选择模型文件</p>
              <p className="text-xs text-brand-text-dim mt-1">支持 STL / OBJ / 3MF / STEP / STP</p>
            </button>
          )}
        </div>

        {/* 步骤2: 填写信息 — 选了文件后才显示 */}
        {selectedFile && (
          <div className="space-y-4">
            <div className="border-t border-brand-border pt-4">
              <p className="text-sm text-brand-text-dim mb-4">② 填写模型信息</p>
            </div>

            <div>
              <label className="text-sm text-brand-text-dim block mb-1">模型名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="输入模型名称"
                className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                         text-sm text-brand-text placeholder:text-brand-text-dim
                         focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="text-sm text-brand-text-dim block mb-1">描述</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="模型描述（可选）"
                rows={3}
                className="w-full px-4 py-3 bg-brand-panel border border-brand-border rounded-lg
                         text-sm text-brand-text placeholder:text-brand-text-dim
                         focus:outline-none focus:border-brand-blue resize-none"
              />
            </div>

            {/* 分类选择 — 与全站统一 */}
            <div>
              <label className="text-sm text-brand-text-dim block mb-1">分类</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                         text-sm text-brand-text focus:outline-none focus:border-brand-blue"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* 定价提示 — 不可编辑 */}
            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-brand-blue mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-brand-text-dim mb-1">系统自动定价</p>
                  <p className="text-xs text-brand-text-muted">
                    上传后系统将根据模型的重量和所选材料自动计算价格。
                    管理员审核通过后，模型将上架展示。
                  </p>
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 border border-brand-border text-brand-text-muted rounded-lg
                         hover:border-brand-blue hover:text-brand-blue text-sm transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="flex-1 py-2.5 bg-brand-orange text-white rounded-lg
                         hover:bg-brand-orange-light text-sm font-medium transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    确认上传
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
