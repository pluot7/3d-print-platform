import { useState, useEffect, useRef } from 'react'
import { Shield, Heart, Share2, ZoomIn, RotateCcw, Download, Eye, Clock, Loader2, MessageSquare, Send, Trash2, X, Reply as ReplyIcon } from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getModel, ModelResponse } from '../api/models'
import { calculatePrice, PriceResponse } from '../api/orders'
import { FlagIcon } from 'lucide-react'
import ReportModal from '../components/ReportModal'
import {
  getModelComments, createModelComment, deleteModelComment, getAvatarUrl,
  ModelComment,
} from '../api/modelComments'
import { addToCart } from '../api/cart'
import { useAuth } from '../contexts/AuthContext'

const materialOptions = ['PLA', 'ABS', 'PETG', '树脂', '尼龙']
const colorOptions = [
  { hex: '#FFFFFF', filter: 'none', name: '白色' },
  { hex: '#1a1a1a', filter: 'brightness(0.2)', name: '黑色' },
  { hex: '#f97316', filter: 'sepia(0.6) saturate(3) hue-rotate(0deg) brightness(0.9)', name: '橙色' },
  { hex: '#3b82f6', filter: 'sepia(0.6) saturate(3) hue-rotate(195deg) brightness(0.9)', name: '蓝色' },
  { hex: '#22c55e', filter: 'sepia(0.6) saturate(3) hue-rotate(80deg) brightness(0.9)', name: '绿色' },
  { hex: '#eab308', filter: 'sepia(0.6) saturate(3) hue-rotate(5deg) brightness(0.95)', name: '黄色' },
  { hex: '#ec4899', filter: 'sepia(0.6) saturate(3) hue-rotate(300deg) brightness(0.9)', name: '粉色' },
  { hex: '#8b5cf6', filter: 'sepia(0.6) saturate(3) hue-rotate(240deg) brightness(0.9)', name: '紫色' },
]
const precisionOptions = [
  { label: '0.2mm', layer_height: 0.2, multiplier: 1.5 },
  { label: '0.4mm', layer_height: 0.4, multiplier: 1.0 },
  { label: '0.6mm', layer_height: 0.6, multiplier: 0.8 },
  { label: '0.8mm', layer_height: 0.8, multiplier: 0.6 },
]

export default function ModelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [model, setModel] = useState<ModelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareModelUrl, setShareModelUrl] = useState('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  const [selectedMaterial, setSelectedMaterial] = useState('PLA')
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])
  const [selectedPrecision, setSelectedPrecision] = useState(1.0)
  const [quantity, setQuantity] = useState(1)
  const [priceInfo, setPriceInfo] = useState<PriceResponse | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [modelViewerEl, setModelViewerEl] = useState<any>(null)

  // 缩放相关
  const maxDim = model
    ? Math.max(model.dimensions_x || 0, model.dimensions_y || 0, model.dimensions_z || 0)
    : 0
  const minScale = 0.25
  const maxScale = Math.min(3.0, maxDim > 0 ? 330 / maxDim : 3.0)
  const [scale, setScale] = useState(1.0)

  // 计算缩放后的值
  const scaledDims = model
    ? {
        x: ((model.dimensions_x || 0) * scale).toFixed(1),
        y: ((model.dimensions_y || 0) * scale).toFixed(1),
        z: ((model.dimensions_z || 0) * scale).toFixed(1),
      }
    : null
  const scaledVolume = model?.volume ? (model.volume * scale * scale * scale).toFixed(1) : null
  const scaledWeight = model?.weight ? (model.weight * scale * scale * scale).toFixed(1) : null

  // 加载模型数据
  useEffect(() => {
    const fetchModel = async () => {
      if (!id) return
      try {
        setLoading(true)
        console.log('Fetching model ID:', id)
        const data = await getModel(parseInt(id))
        console.log('Model data received:', data)
        setModel(data)
      } catch (err: any) {
        const errMsg = err?.response?.data?.detail || err?.message || err?.toString() || '未知错误'
        console.error('Fetch model error:', err)
        setError('加载模型失败: ' + errMsg)
      } finally {
        setLoading(false)
      }
    }
    fetchModel()
  }, [id])

  // 模型加载后检查是否已收藏（仅登录用户）
  useEffect(() => {
    if (!id || !isAuthenticated) return
    import('../api/favorites').then(m => m.checkFavorite(Number(id))).then(f => setIsFavorited(f)).catch(() => {})
  }, [id, isAuthenticated])

  const toggleFavorite = async () => {
    if (!id || !isAuthenticated) {
      navigate('/login')
      return
    }
    setFavLoading(true)
    try {
      const m = await import('../api/favorites')
      if (isFavorited) {
        await m.removeFavorite(Number(id))
        setIsFavorited(false)
      } else {
        await m.addFavorite(Number(id))
        setIsFavorited(true)
      }
    } catch (e) { console.error(e) }
    setFavLoading(false)
  }

  const handleShareClick = async () => {
    if (!model) return
    setShareModelUrl(`${window.location.origin}/model/${model.id}`)
    setShareOpen(true)
  }

  // 计算价格
  useEffect(() => {
    const calcPrice = async () => {
      if (!model) return
      try {
        setCalculating(true)
        const precision = precisionOptions.find(p => p.multiplier === selectedPrecision)
        const result = await calculatePrice({
          model_id: model.id,
          dimensions_x: (model.dimensions_x || 0) * scale,
          dimensions_y: (model.dimensions_y || 0) * scale,
          dimensions_z: (model.dimensions_z || 0) * scale,
          material: selectedMaterial,
          layer_height: precision?.layer_height || 0.2,
          infill: 20,
          quantity: quantity,
          scale: scale,
        })
        setPriceInfo(result)
      } catch (err) {
        console.error('Price calculation failed:', err)
      } finally {
        setCalculating(false)
      }
    }
    calcPrice()
  }, [model, selectedMaterial, selectedPrecision, quantity, scale])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
      </div>
    )
  }

  if (error || !model) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center">
        <p className="text-brand-text-dim mb-4">{error || '模型不存在'}</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          返回首页
        </button>
      </div>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-sm text-brand-text-dim mb-6">
          <Link to="/" className="hover:text-brand-blue transition-colors">首页</Link>
          <span>/</span>
          <Link to="/official" className="hover:text-brand-blue transition-colors">
            {model.is_official ? '官方模型' : '社区模型'}
          </Link>
          <span>/</span>
          <span className="text-brand-text">{model.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧 - 3D查看器 */}
          <div className="space-y-4">
            {/* 主预览框 - model-viewer */}
            <div className="relative aspect-square bg-brand-panel border border-brand-border rounded-2xl overflow-hidden">
              {/* 背景网格 */}
              <div className="absolute inset-0 grid-bg opacity-30" />
              
              {/* 3D模型查看器 - 填满整个容器 */}
              {model.glb_path ? (
                <model-viewer
                  ref={(el: any) => {
                    if (el) {
                      setModelViewerEl(el)
                      const setCamera = () => {
                        el.cameraOrbit = '0deg 75deg 2.5m'
                        el.fieldOfView = '45deg'
                        el.jumpCameraToGoal()
                      }
                      el.addEventListener('load', setCamera)
                    }
                  }}
                  src={`/${model.glb_path}`}
                  auto-rotate
                  camera-controls
                  camera-target="auto"
                  loading="eager"
                  shadow-intensity="1"
                  scale={`${scale} ${scale} ${scale}`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', filter: selectedColor.filter }}
                  onError={(e: any) => console.error('模型加载失败:', e)}
                />
              ) : (
                /* 无glb时的占位 */
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-32 h-32 text-brand-text-dim" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.8">
                    <path d="M32 8L56 22V42L32 56L8 42V22L32 8Z" />
                    <path d="M32 8V56" />
                    <path d="M8 22L56 42" />
                    <path d="M56 22L8 42" />
                    <path d="M32 22V42" />
                    <path d="M20 15L44 33" />
                    <path d="M44 15L20 33" />
                  </svg>
                </div>
              )}

              {/* 控制提示 */}
              {model.glb_path && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-brand-text-dim">
                  <span>拖动旋转 · 滚轮缩放</span>
                </div>
              )}

              {/* 官方标签 */}
              {model.is_official && (
                <div className="absolute top-4 left-4">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue/90 text-white text-sm
                                font-medium rounded-lg shadow-brand-blue">
                    <Shield className="w-4 h-4" />
                    官方认证
                  </span>
                </div>
              )}
            </div>

            {/* 模型信息 */}
            <div className="card-base p-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-brand-text">模型参数</h3>
                {scale !== 1.0 && (
                  <span className="text-xs text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                    x{(scale * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              {[
                { label: '文件格式', value: model.file_type.toUpperCase() },
                { label: '文件大小', value: formatFileSize(model.file_size) },
                ...(scaledDims ? [{
                  label: '打印尺寸',
                  value: `${scaledDims.x} x ${scaledDims.y} x ${scaledDims.z} mm`,
                  note: scale !== 1.0 && model.dimensions_x
                    ? `（原 ${model.dimensions_x} x ${model.dimensions_y} x ${model.dimensions_z}）`
                    : undefined,
                }] : []),
                ...(scaledVolume ? [{ label: '体积', value: `${scaledVolume} cm3` }] : []),
                ...(scaledWeight ? [{ label: '重量', value: `${scaledWeight} g` }] : []),
                { label: '浏览次数', value: model.view_count },
                { label: '上传时间', value: model.created_at?.split('T')[0] || '-' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-brand-text-dim">{item.label}</span>
                  <span className="text-brand-text font-mono text-right">
                    {item.value}
                    {item.note && <span className="text-brand-text-dim text-xs ml-1">{item.note}</span>}
                  </span>
                </div>
              ))}
            </div>

            {/* 描述 */}
            {model.description && (
              <div className="card-base p-5">
                <h3 className="text-sm font-semibold text-brand-text mb-3">模型描述</h3>
                <p className="text-sm text-brand-text-muted leading-relaxed">
                  {model.description}
                </p>
              </div>
            )}
          </div>

          {/* 右侧 - 配置与下单 */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-brand-text">{model.name}</h1>
                  <div className="flex items-center gap-4 mt-2 text-sm text-brand-text-dim">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" /> {model.view_count} 浏览
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> 2-3天交付
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleFavorite}
                    disabled={favLoading}
                    className={`p-2 border border-brand-border rounded-lg transition-all ${
                      isFavorited
                        ? 'border-red-400/50 bg-red-400/10 text-red-400'
                        : 'text-brand-text-dim hover:text-red-400 hover:border-red-400'
                    }`}
                    title={isFavorited ? '取消收藏' : '收藏'}
                  >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShareClick}
                    className="p-2 border border-brand-border rounded-lg text-brand-text-dim hover:text-brand-blue hover:border-brand-blue transition-all"
                    title="分享模型"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 材质选择 */}
            <div className="card-base p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-3">选择材质</h3>
              <div className="grid grid-cols-5 gap-2">
                {materialOptions.map((mat) => (
                  <button
                    key={mat}
                    onClick={() => setSelectedMaterial(mat)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                      selectedMaterial === mat
                        ? 'bg-brand-orange/15 text-brand-orange border-brand-orange'
                        : 'bg-brand-panel text-brand-text-muted border-brand-border hover:border-brand-blue'
                    }`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-brand-text-dim">
                {selectedMaterial === 'PLA' && '最常用，易打印，环保可降解，适合大多数应用场景'}
                {selectedMaterial === 'ABS' && '强度高，耐高温，适合功能性零件'}
                {selectedMaterial === 'PETG' && '韧性好，防水，适合户外使用'}
                {selectedMaterial === '树脂' && '精度最高，表面光滑，适合精细模型'}
                {selectedMaterial === '尼龙' && '耐磨，强度高，适合机械零件'}
              </p>
            </div>

            {/* 颜色选择 */}
            <div className="card-base p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-3">选择颜色</h3>
              <p className="text-xs text-brand-text-dim mb-3 leading-relaxed">
                ⚠️ 颜色预览通过 CSS 滤镜模拟，实际打印效果以实物为准。带纹理贴图的模型颜色切换效果有限。
              </p>
              <div className="flex gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => setSelectedColor(color)}
                    className={`w-9 h-9 rounded-lg border-2 transition-all ${
                      selectedColor.hex === color.hex
                        ? 'border-brand-blue shadow-brand-blue scale-110'
                        : 'border-brand-border hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* 精度选择 */}
            <div className="card-base p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-3">打印精度</h3>
              <div className="grid grid-cols-4 gap-2">
                {precisionOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedPrecision(opt.multiplier)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                      selectedPrecision === opt.multiplier
                        ? 'bg-brand-orange/15 text-brand-orange border-brand-orange'
                        : 'bg-brand-panel text-brand-text-muted border-brand-border hover:border-brand-blue'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 缩放控制 */}
            <div className="card-base p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-brand-text">打印缩放</h3>
                <span className="text-sm font-bold text-brand-orange">
                  {(scale * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={minScale}
                max={maxScale}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-orange"
              />
              <div className="flex gap-2 mt-3">
                {([0.5, 0.75, 1.0, 1.25, 1.5] as const).filter(s => s <= maxScale).map(s => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      Math.abs(scale - s) < 0.005
                        ? 'bg-brand-orange/15 text-brand-orange border-brand-orange'
                        : 'bg-brand-panel text-brand-text-muted border-brand-border hover:border-brand-blue'
                    }`}
                  >
                    {s < 1 ? `${(s * 100).toFixed(0)}%` : `${(s * 100).toFixed(0)}%`}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-brand-text-dim">
                缩放范围：25% ~ {(maxScale * 100).toFixed(0)}%（超出330mm成型面积）
              </p>
            </div>

            {/* 数量 */}
            <div className="card-base p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-3">数量</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-brand-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-brand-text-muted hover:text-brand-text hover:bg-white/5 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-brand-text font-mono min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-brand-text-muted hover:text-brand-text hover:bg-white/5 transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-brand-text-dim">库存充足</span>
              </div>
            </div>

            {/* 价格与下单 */}
            <div className="card-base p-5 border-brand-orange/30">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-sm text-brand-text-dim">预估价格</span>
                  <div className="text-3xl font-bold text-brand-orange">
                    {calculating ? (
                      <Loader2 className="w-8 h-8 animate-spin inline" />
                    ) : (
                      `¥${priceInfo?.total_price.toFixed(0) || model.base_price}`
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-brand-text-dim">
                  <div>预计工期: 2-3个工作日</div>
                  <div>顺丰包邮</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/order/${model.id}`}
                  state={{ 
                    model,
                    config: {
                      material: selectedMaterial,
                      color: selectedColor.hex,
                      precision: selectedPrecision,
                      quantity,
                      scale,
                    }
                  }}
                  className="flex-1 py-3 bg-brand-orange text-white text-center font-semibold rounded-lg
                           hover:bg-brand-orange-light shadow-brand-orange hover:shadow-lg transition-all"
                >
                  立即下单
                </Link>
                <button
                  onClick={async () => {
                    try {
                      await addToCart({
                        model_id: model.id,
                        material: selectedMaterial,
                        color: selectedColor.name,
                        layer_height: precisionOptions.find(p => p.multiplier === selectedPrecision)?.layer_height || 0.2,
                        infill: 20,
                        quantity,
                        scale,
                      });
                      const btn = document.getElementById('cart-add-btn');
                      if (btn) {
                        btn.textContent = '已添加 ✅';
                        setTimeout(() => { btn.textContent = '加入购物车' }, 2000);
                      }
                    } catch (e: any) {
                      alert(e?.response?.data?.detail || '添加失败');
                    }
                  }}
                  id="cart-add-btn"
                  className="px-4 py-3 border border-brand-border text-brand-text-muted rounded-lg
                           hover:border-brand-orange hover:text-brand-orange hover:bg-brand-orange/5 transition-all"
                >
                  加入购物车
                </button>
                <button
                  onClick={toggleFavorite}
                  disabled={favLoading}
                  className={`p-3 border rounded-lg transition-all ${
                    isFavorited
                      ? 'border-red-400/50 bg-red-400/10 text-red-400'
                      : 'border-brand-border text-brand-text-dim hover:border-red-400/50 hover:text-red-400 hover:bg-red-400/5'
                  }`}
                  title={isFavorited ? '取消收藏' : '收藏'}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => setReportOpen(true)}
                  className="p-3 border border-brand-border text-brand-text-dim rounded-lg
                           hover:border-red-400/50 hover:text-red-400 hover:bg-red-400/5 transition-all"
                  title="举报"
                >
                  <FlagIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="model"
          targetId={model.id}
          targetLabel={model.name}
        />

        {/* ========== 评论区 ========== */}
        <ModelCommentsSection modelId={parseInt(id!)} />

        {/* 分享弹窗 */}
        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShareOpen(false)}>
            <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brand-text">分享模型</h3>
                <button onClick={() => setShareOpen(false)} className="text-brand-text-dim hover:text-brand-text transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-brand-text-dim">分享链接给好友：</p>

                {/* 链接复制区 */}
                <div className="flex items-center gap-2 bg-brand-bg rounded-lg p-2">
                  <input
                    type="text"
                    readOnly
                    value={shareModelUrl}
                    className="flex-1 bg-transparent text-xs text-brand-text-dim outline-none"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareModelUrl)
                      alert('链接已复制到剪贴板')
                    }}
                    className="px-3 py-1 text-xs font-medium text-brand-orange hover:bg-brand-orange/10 rounded-lg transition-colors"
                  >
                    复制
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ 子组件：单条评论（含回复列表） ============

function CommentItem({
  comment,
  user,
  isAuthenticated,
  onDelete,
  onReport,
  onReply,
  replyingTo,
  replyText,
  onReplyTextChange,
  onReplySubmit,
  submittingReply,
  depth = 0,
}: {
  comment: ModelComment
  user: any
  isAuthenticated: boolean
  onDelete: (id: number) => void
  onReport: (c: ModelComment) => void
  onReply: (c: ModelComment) => void
  replyingTo: number | null
  replyText: string
  onReplyTextChange: (text: string) => void
  onReplySubmit: (parentId: number) => Promise<void>
  submittingReply: boolean
  depth?: number
}) {
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const isReply = depth > 0

  return (
    <div>
      <div className={`flex items-start gap-2.5 ${isReply ? 'py-2' : ''}`}>
        <Link to={`/user/${comment.author.id}`}>
          <img
            src={getAvatarUrl(comment.author)}
            className={`rounded-full shrink-0 bg-brand-panel hover:opacity-80 transition-opacity ${isReply ? 'w-6 h-6' : 'w-8 h-8 mt-0.5'}`}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <Link to={`/user/${comment.author.id}`} className={`font-medium text-brand-text hover:text-brand-blue transition-colors ${isReply ? 'text-xs' : 'text-sm'}`}>
              {comment.author.username}
            </Link>
            {comment.reply_to_author && (
              <span className="text-xs text-brand-text-dim">
                回复 <span className="text-brand-blue">@{comment.reply_to_author.username}</span>
              </span>
            )}
            <span className="text-xs text-brand-text-dim">{formatTime(comment.created_at)}</span>
          </div>
          <p className={`text-brand-text/80 whitespace-pre-wrap ${isReply ? 'text-xs' : 'text-sm'}`}>
            {comment.content}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            {isAuthenticated && (
              <button
                onClick={() => onReply(comment)}
                className="flex items-center gap-1 text-xs text-brand-text-dim hover:text-brand-orange transition-colors"
              >
                <ReplyIcon className="w-3 h-3" />
                回复
              </button>
            )}
            {(user?.id === comment.user_id || user?.role === 'admin' || user?.role === 'super_admin') && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-brand-text-dim hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                删除
              </button>
            )}
            <button
              onClick={() => onReport(comment)}
              className="flex items-center gap-1 text-xs text-brand-text-dim hover:text-red-400 transition-colors"
            >
              <FlagIcon className="w-3 h-3" />
              举报
            </button>
          </div>

          {/* 回复输入框 */}
          {replyingTo === comment.id && (
            <div className="mt-2.5 pl-2 border-l-2 border-brand-orange/30">
              <textarea
                value={replyText}
                onChange={e => onReplyTextChange(e.target.value)}
                rows={2}
                placeholder={`回复 @${comment.author.username}...`}
                className="w-full px-3 py-2 bg-brand-panel border border-brand-border rounded-lg
                           text-sm text-brand-text placeholder:text-brand-text-dim
                           focus:outline-none focus:border-brand-blue transition-colors resize-none"
              />
              <div className="flex justify-end gap-2 mt-1.5">
                <button
                  onClick={() => {
                    onReplyTextChange('')
                    onReply(comment) // 触发关闭回复框
                  }}
                  className="px-3 py-1 text-xs text-brand-text-dim hover:text-brand-text transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => onReplySubmit(comment.id)}
                  disabled={submittingReply || !replyText.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-brand-orange text-white rounded-md
                             text-xs hover:bg-brand-orange/90 transition-colors disabled:opacity-50"
                >
                  {submittingReply ? '发送中...' : <><Send className="w-3 h-3" /> 回复</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 子回复列表 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 pl-3 border-l-2 border-brand-border/30 space-y-0.5 mt-1">
          {comment.replies.map(r => (
            <CommentItem
              key={r.id}
              comment={r}
              user={user}
              isAuthenticated={isAuthenticated}
              onDelete={onDelete}
              onReport={onReport}
              onReply={onReply}
              replyingTo={replyingTo}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onReplySubmit={onReplySubmit}
              submittingReply={submittingReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}


// ============ 评论区主组件 ============

function ModelCommentsSection({ modelId }: { modelId: number }) {
  const { user, isAuthenticated } = useAuth()
  const [comments, setComments] = useState<ModelComment[]>([])
  const [total, setTotal] = useState(0)
  const [loadingComments, setLoadingComments] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [reportComment, setReportComment] = useState<ModelComment | null>(null)

  // 回复状态
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const fetchComments = async () => {
    try {
      const res = await getModelComments(modelId)
      setComments(res.items)
      setTotal(res.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => { fetchComments() }, [modelId])

  // 发表顶级评论
  const handleSubmit = async () => {
    if (!commentText.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const c = await createModelComment(modelId, commentText.trim())
      setComments(prev => [c, ...prev])
      setTotal(prev => prev + 1)
      setCommentText('')
    } catch (e: any) {
      setSubmitError(e.response?.data?.detail || '评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 点击回复
  const handleReplyClick = (comment: ModelComment) => {
    if (replyingTo === comment.id) {
      setReplyingTo(null) // 关闭已打开的回复框
    } else {
      setReplyingTo(comment.id)
      setReplyText('')
    }
  }

  // 提交回复
  const handleReplySubmit = async (parentId: number) => {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      const c = await createModelComment(modelId, replyText.trim(), parentId)
      // 在顶级评论中查找 parentId，若未找到则遍历子回复找到其所在的顶级评论
      setComments(prev => {
        let found = false
        const updated = prev.map(top => {
          if (top.id === parentId) {
            found = true
            return { ...top, replies: [...(top.replies || []), c] }
          }
          return top
        })
        if (!found) {
          // parentId 是子回复的 id，找到该子回复所属的顶级评论，将新回复添加进去
          return updated.map(top => {
            const hasChild = (top.replies || []).some(r => r.id === parentId)
            if (hasChild) {
              return { ...top, replies: [...(top.replies || []), c] }
            }
            return top
          })
        }
        return updated
      })
      setTotal(prev => prev + 1)
      setReplyText('')
      setReplyingTo(null)
    } catch (e: any) {
      console.error('Reply failed:', e)
    } finally {
      setSubmittingReply(false)
    }
  }

  // 删除评论
  const handleDelete = async (commentId: number) => {
    try {
      await deleteModelComment(commentId)
      setComments(prev => {
        const filtered = prev.filter(c => c.id !== commentId)
        if (filtered.length === prev.length) {
          // 没在顶级找到，尝试从子回复中删除
          return prev.map(c => ({
            ...c,
            replies: c.replies?.filter(r => r.id !== commentId) || [],
          }))
        }
        return filtered
      })
      setTotal(prev => prev - 1)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-brand-text mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-brand-orange" />
        评论 ({total})
      </h2>

      {/* 顶级评论输入框 */}
      {isAuthenticated ? (
        <div className="mb-5">
          {submitError && (
            <div className="mb-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg
                            text-red-400 text-sm">{submitError}</div>
          )}
          <div className="flex gap-3">
            <Link to={`/user/${user!.id}`}>
              <img
                src={getAvatarUrl({
                  id: user!.id, username: user!.username,
                  full_name: user!.fullName || null, avatar_url: user!.avatar || null,
                })}
                className="w-8 h-8 rounded-full shrink-0 bg-brand-panel mt-1 hover:opacity-80 transition-opacity"
              />
            </Link>
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={3}
                placeholder="写下你对这款模型的评价或问题..."
                className="w-full px-3 py-2.5 bg-brand-panel border border-brand-border rounded-lg
                           text-sm text-brand-text placeholder:text-brand-text-dim
                           focus:outline-none focus:border-brand-blue transition-colors resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !commentText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg
                             text-sm hover:bg-brand-orange/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? '发送中...' : '发表评论'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-base p-4 text-center mb-5">
          <p className="text-sm text-brand-text-dim">
            <Link to="/login" className="text-brand-orange hover:underline">登录</Link>
            后才能发表评论
          </p>
        </div>
      )}

      {/* 评论列表 */}
      {loadingComments ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-brand-orange animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="card-base p-8 text-center text-brand-text-dim text-sm">
          暂无评论，快来抢沙发吧！
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="card-base p-4">
              <CommentItem
                comment={c}
                user={user}
                isAuthenticated={isAuthenticated}
                onDelete={handleDelete}
                onReport={setReportComment}
                onReply={handleReplyClick}
                replyingTo={replyingTo}
                replyText={replyText}
                onReplyTextChange={setReplyText}
                onReplySubmit={handleReplySubmit}
                submittingReply={submittingReply}
              />
            </div>
          ))}
        </div>
      )}

      <ReportModal
        open={!!reportComment}
        onClose={() => setReportComment(null)}
        targetType="comment"
        targetId={reportComment?.id ?? 0}
        targetLabel={reportComment?.content?.slice(0, 30)}
      />
    </div>
  )
}
