import { useState, useEffect } from 'react'
import { Printer, Ruler, Package, Shield, Info, Check, Weight as WeightIcon, Loader2 } from 'lucide-react'
import { getMaterials, MaterialData } from '../api/materials'

const INFILL_PRESETS = [
  { level: '经济型', ratio: 10, desc: '内部低填充，适合展示件' },
  { level: '标准型', ratio: 15, desc: '均衡强度与耗材，适合大多数模型' },
  { level: '增强型', ratio: 25, desc: '高填充，适合功能件' },
  { level: '实心型', ratio: 100, desc: '完全填充，适合承重件' },
]

const FAQ = [
  { q: '价格是怎么计算的？', a: '最终价格 = 重量(克) × 材料单价 + 服务费。其中重量由模型体积 × 材料密度计算，并加入了壁厚、填充率等实际打印参数，系统自动估算，精度可达95%以上。' },
  { q: '为什么模型重量和价格会变化？', a: '价格与您选择的材料类型、缩放比例、填充率（层高）直接相关。模型体积随缩放倍数立方级变化，不同材料单价和密度也不同。' },
  { q: '如果需要加急打印怎么办？', a: '您可以在下单时给管理员备注加急需求。加急服务会优先排产，通常1-2个工作日内发货。' },
  { q: 'Nova豆怎么用？', a: 'Nova豆是平台奖励积分。每1个Nova豆可抵扣0.5%的订单金额，最高累计抵扣50%。审核通过的模型创作者也会获得Nova豆奖励。' },
  { q: '运费怎么算？', a: '订单满99元包邮（中国大陆地区）。不满99元统一收取10元运费。偏远地区可能产生附加费，具体以下单时为准。' },
  { q: '可以退换货吗？', a: '因3D打印为定制化服务，非质量问题不支持退换。如收到货品存在打印缺陷、运输损坏等问题，请在48小时内联系客服处理。' },
]

export default function Pricing() {
  const [materials, setMaterials] = useState<MaterialData[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMaterials().then(res => {
      setMaterials(res.items)
      if (res.items.length > 0) setSelectedId(res.items[0].id)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const selected = materials.find(m => m.id === selectedId)

  // 示例价格（假设50g模型）
  const sampleWeight = 50
  const samplePrice = selected ? (sampleWeight * selected.price_per_gram / 1000 * 10).toFixed(2) : '0.00'

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-orange/5 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            价格说明
          </h1>
          <p className="text-brand-text-muted max-w-2xl mx-auto text-lg">
            3D打印按重量计价，材料不同单价不同。系统自动计算您的模型重量，下单时清晰可见。
          </p>
        </div>
      </section>

      {/* 计价公式 */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="card-base p-6 sm:p-8 mb-12">
          <h2 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-orange" />
            计价公式
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: WeightIcon, label: '重量计算', desc: '模型体积 × 材料密度，考虑壁厚与填充率' },
              { icon: Printer, label: '材料单价', desc: '根据所选材料按克计价，材料越贵单价越高' },
              { icon: Package, label: '最终价格', desc: '重量(克) × 单价 + 服务费，满99包邮' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-brand-text mb-1">{item.label}</h3>
                <p className="text-sm text-brand-text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-brand-panel rounded-xl border border-brand-border">
            <p className="text-sm text-brand-text-dim text-center">
              <span className="text-brand-orange font-semibold">示例：</span>
              一个 {sampleWeight}g 的模型，使用 <strong className="text-brand-text">{selected?.name_zh || ''}</strong> 材料，
              约需 <span className="text-brand-orange font-bold text-lg">¥{samplePrice}</span>
            </p>
          </div>
        </div>

        {/* 材料价格表（从数据库读取） */}
        <h2 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-blue" />
          材料价格表
        </h2>
        <div className="overflow-x-auto mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-panel border-b border-brand-border">
                <th className="px-4 py-3 text-left font-semibold text-brand-text">材料</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-text">单价（¥/g）</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-text hidden sm:table-cell">密度（g/cm³）</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-text hidden md:table-cell">说明</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => (
                <tr
                  key={m.id}
                  className={`border-b border-brand-border/50 hover:bg-brand-panel/50 transition-colors cursor-pointer
                    ${selectedId === m.id ? 'bg-brand-blue/5' : ''}`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <td className="px-4 py-3">
                    <span className={`font-medium ${selectedId === m.id ? 'text-brand-blue' : 'text-brand-text'}`}>
                      {m.icon && <span className="mr-1">{m.icon}</span>}
                      {m.name_zh}
                    </span>
                    {selectedId === m.id && <Check className="w-4 h-4 text-brand-blue inline ml-1" />}
                  </td>
                  <td className="px-4 py-3 text-brand-text-muted">{m.price_per_gram.toFixed(3)}</td>
                  <td className="px-4 py-3 text-brand-text-dim hidden sm:table-cell">{m.density}</td>
                  <td className="px-4 py-3 text-brand-text-dim/70 text-xs hidden md:table-cell">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-brand-text-dim/50 mt-2 text-right">
            材料价格由平台管理员动态维护
          </p>
        </div>

        {/* 填充率参考 */}
        <div className="card-base p-6 sm:p-8 mb-12">
          <h2 className="text-xl font-bold text-brand-text mb-4 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-brand-orange" />
            填充率参考
          </h2>
          <p className="text-sm text-brand-text-muted mb-4">
            填充率越高，模型越坚固、越重、价格越高。您在下单时可以自由选择填充率。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {INFILL_PRESETS.map(p => (
              <div key={p.level} className="bg-brand-panel rounded-xl p-4 border border-brand-border">
                <div className="text-lg font-bold text-brand-blue">{p.ratio}%</div>
                <div className="text-sm font-semibold text-brand-text mt-1">{p.level}</div>
                <div className="text-xs text-brand-text-dim mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <h2 className="text-xl font-bold text-brand-text mb-6 flex items-center gap-2">
          <Info className="w-5 h-5 text-brand-orange" />
          常见问题
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <details key={i} className="card-base p-4 group open:border-brand-blue transition-all">
              <summary className="font-medium text-brand-text cursor-pointer list-none flex items-center justify-between">
                <span>{item.q}</span>
                <span className="text-brand-text-dim group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-brand-text-muted leading-relaxed border-t border-brand-border pt-3">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        {/* 管理员管理入口 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-brand-text-dim/50">
            管理员登录后可在后台「材料管理」中调整价格
          </p>
        </div>
      </section>
    </div>
  )
}
