import { Search, SlidersHorizontal, ArrowUpDown, Eye, Heart } from 'lucide-react'

const categories = [
  { name: '全部', value: '' },
  { name: '手办人物', value: 'figure' },
  { name: '机械零件', value: 'mechanical' },
  { name: '建筑模型', value: 'architectural' },
  { name: '艺术摆件', value: 'art' },
  { name: '其他', value: 'other' },
]

const sortOptions = [
  { name: '最新上传', value: 'upload_time', icon: ArrowUpDown },
  { name: '最多浏览', value: 'view_count', icon: Eye },
  { name: '最多收藏', value: 'favorite_count', icon: Heart },
]

interface FilterSidebarProps {
  activeCategory?: string
  onCategoryChange?: (category: string) => void
  search?: string
  onSearchChange?: (search: string) => void
  onSearchSubmit?: () => void
  activeSort?: string
  onSortChange?: (sort: string) => void
}

export default function FilterSidebar({
  activeCategory = '',
  onCategoryChange,
  search = '',
  onSearchChange,
  onSearchSubmit,
  activeSort = 'upload_time',
  onSortChange,
}: FilterSidebarProps) {
  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="sticky top-20 space-y-5">
        {/* 搜索框 — 按回车搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
          <input
            type="text"
            placeholder="按回车搜索..."
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearchSubmit?.()
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                     text-sm text-brand-text placeholder:text-brand-text-dim
                     focus:outline-none focus:border-brand-blue focus:shadow-brand-blue
                     transition-all duration-200"
          />
        </div>

        {/* 分类 */}
        <div className="card-base p-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
            <h3 className="text-sm font-semibold text-brand-text">分类</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => onCategoryChange?.(cat.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200
                  ${activeCategory === cat.value
                    ? 'bg-brand-orange/15 text-brand-orange border-brand-orange/30'
                    : 'bg-brand-panel text-brand-text-dim border-brand-border hover:border-brand-blue hover:text-brand-blue'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 排序 */}
        <div className="card-base p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpDown className="w-4 h-4 text-brand-blue" />
            <h3 className="text-sm font-semibold text-brand-text">排序</h3>
          </div>
          <div className="space-y-1">
            {sortOptions.map(({ name, value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => onSortChange?.(value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200
                  ${activeSort === value
                    ? 'bg-brand-blue/10 text-brand-blue font-medium'
                    : 'text-brand-text-dim hover:text-brand-text hover:bg-brand-panel'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
