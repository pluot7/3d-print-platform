import { Eye, Heart, Box } from 'lucide-react'

interface ModelCardProps {
  id: number
  name: string
  author?: string
  price: string | number
  category: string
  isOfficial?: boolean
  faces?: string
  weight?: number | null
  fileType?: string
  glbPath?: string | null
  viewCount?: number
}

const API_BASE = ''

const categoryNames: Record<string, string> = {
  figure: '手办人物',
  mechanical: '机械零件',
  architectural: '建筑模型',
  art: '艺术摆件',
  other: '其他',
}

export default function ModelCard({ id, name, author, price, category, isOfficial, weight, fileType, glbPath, viewCount }: ModelCardProps) {
  const displayPrice = typeof price === 'number' ? price.toFixed(0) : price

  return (
    <div className="group block">
      <div className="card-base overflow-hidden">
        {/* 模型预览 */}
        <div className="relative aspect-[4/3] bg-brand-panel flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />

          {glbPath ? (
            <img
              src={`${API_BASE}/uploads/thumbs/${glbPath.split('/').pop()?.replace('.glb', '.png') || ''}`}
              alt={name}
              className="relative z-10 w-full h-full object-cover"
              onError={(e) => {
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
            style={{ display: glbPath ? 'none' : 'flex' }}
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

          {/* 标签 */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
            {isOfficial && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-brand-blue/90 text-white text-xs
                            font-medium rounded-md">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                官方
              </span>
            )}
            <span className="px-2 py-0.5 bg-brand-dark/70 text-brand-text-muted text-xs
                          font-medium rounded-md border border-brand-border/50">
              {categoryNames[category] || category}
            </span>
          </div>

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
            {name}
          </h3>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-brand-text-dim">
              <Eye className="w-3.5 h-3.5" />
              <span>{viewCount || 0} 次浏览</span>
            </div>
            {weight && (
              <span className="text-xs text-brand-text-dim">{weight}g</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border/50">
            <span className="text-lg font-bold text-brand-orange">¥{displayPrice}</span>
            <span className="text-xs text-brand-text-dim font-mono px-2 py-1 bg-brand-panel rounded">
              {fileType?.toUpperCase() || '3MF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
