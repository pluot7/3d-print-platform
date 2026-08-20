import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { BookOpen, Printer, Package, Headphones, ChevronDown, Loader2 } from 'lucide-react'
import { getHelpSection, HelpArticleData } from '../api/help'

type Tab = 'help' | 'guide' | 'materials' | 'service'

const TABS: { key: Tab; icon: typeof BookOpen; label: string }[] = [
  { key: 'help', icon: BookOpen, label: '帮助中心' },
  { key: 'guide', icon: Printer, label: '打印指南' },
  { key: 'materials', icon: Package, label: '材质说明' },
  { key: 'service', icon: Headphones, label: '售后服务' },
]

// 材质说明部分保持静态（可后续改为API）
const MATERIAL_SECTIONS = [
  {
    id: 'pla', name: 'PLA（聚乳酸）', icon: '\U0001f33f', price: '¥0.35/g', density: '1.24 g/cm\u00b3',
    strength: '中等', heat: '~60\u00b0C', color: '多色可选',
    desc: '最常用的3D打印材料，环保可降解，无异味，打印难度低。适合展示件、原型验证、教育模型。表面可打磨上色，但耐热性一般。',
    pros: ['环保生物降解', '打印容易，不易翘边', '价格实惠', '颜色丰富'],
    cons: ['耐热性差', '强度一般', '紫外线易老化'],
  },
  {
    id: 'abs', name: 'ABS（丙烯腈-丁二烯-苯乙烯）', icon: '\U0001f527', price: '¥0.45/g', density: '1.04 g/cm\u00b3',
    strength: '高', heat: '~100\u00b0C', color: '多色可选',
    desc: '工程塑料，强度高耐冲击，可丙酮蒸汽抛光。打印时会有轻微气味，建议在通风环境下打印。',
    pros: ['强度高、耐冲击', '可丙酮抛光', '耐热性好', '耐磨'],
    cons: ['打印有气味', '容易翘边', '需要热床', '收缩率较高'],
  },
  {
    id: 'petg', name: 'PETG', icon: '\U0001f9ea', price: '¥0.50/g', density: '1.27 g/cm\u00b3',
    strength: '高', heat: '~80\u00b0C', color: '多色可选',
    desc: '结合了PLA的易打印性和ABS的强度，韧性好、耐化学性。几乎无气味，打印难度低。',
    pros: ['韧性出色', '耐化学性', '几乎无气味', '透明度可选'],
    cons: ['表面易刮花', '吸湿性强', '拉丝较多'],
  },
  {
    id: 'resin', name: '光敏树脂', icon: '\u2728', price: '¥0.80/g', density: '1.15 g/cm\u00b3',
    strength: '低-中', heat: '~50\u00b0C', color: '灰/白/透明',
    desc: '光固化打印材料，精度极高，表面光滑细腻，可以呈现微小细节。但材料脆性较大，不适合受力件。',
    pros: ['超高精度', '表面光滑', '细节表现极佳', '适合小型件'],
    cons: ['脆性大', '不耐紫外线', '需要后处理', '价格较高'],
  },
  {
    id: 'nylon', name: '尼龙', icon: '\u2699\ufe0f', price: '¥1.20/g', density: '1.01 g/cm\u00b3',
    strength: '非常高', heat: '~120\u00b0C', color: '白/黑',
    desc: '高强度工程材料，耐磨、耐温、耐疲劳，自润滑性好。打印难度较高，适合齿轮、轴承座、结构件。',
    pros: ['强度极高', '耐磨', '耐温', '自润滑'],
    cons: ['打印难度大', '易吸湿', '价格高', '可选颜色少'],
  },
  {
    id: 'tpu', name: 'TPU', icon: '\U0001f4aa', price: '¥1.00/g', density: '1.21 g/cm\u00b3',
    strength: '中（弹性）', heat: '~70\u00b0C', color: '多色可选',
    desc: '柔性弹性材料，可弯曲、拉伸、压缩回弹。打印速度需要较慢。',
    pros: ['弹性好', '耐磨', '耐油', '减震'],
    cons: ['打印速度慢', '层间粘合弱', '需要近程送料'],
  },
  {
    id: 'pc', name: 'PC（聚碳酸酯）', icon: '\U0001f6e1\ufe0f', price: '¥1.50/g', density: '1.20 g/cm\u00b3',
    strength: '非常高', heat: '~130\u00b0C', color: '透明/黑/白',
    desc: '顶级工程材料，强度极高且透明。耐高温、耐冲击，但打印难度大。',
    pros: ['强度极高', '透明', '耐高温', '耐冲击'],
    cons: ['打印难度大', '需要高温', '价格高', '易翘边'],
  },
  {
    id: 'pp', name: 'PP（聚丙烯）', icon: '\U0001f371', price: '¥0.70/g', density: '0.90 g/cm\u00b3',
    strength: '中等', heat: '~100\u00b0C', color: '白/半透明',
    desc: '轻质食品级材料，耐疲劳性好，可反复弯折。表面光滑硬度低。',
    pros: ['食品级安全', '耐疲劳', '轻质', '可弯折'],
    cons: ['打印难度高', '粘附性差', '表面硬度低', '可选颜色少'],
  },
]

export default function Help() {
  const { tab } = useParams<{ tab?: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('help')
  const [articles, setArticles] = useState<HelpArticleData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tab && (['help', 'guide', 'service'] as Tab[]).includes(tab as Tab)) {
      setActiveTab(tab as Tab)
    }
  }, [tab])

  useEffect(() => {
    if (activeTab === 'materials') {
      setLoading(false)
      return
    }
    setLoading(true)
    getHelpSection(activeTab)
      .then(setArticles)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeTab])

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-brand-text text-center">帮助与服务</h1>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* 标签页 */}
        <div className="flex flex-wrap gap-1 mb-8 bg-brand-panel rounded-xl p-1 border border-brand-border">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.key
                    ? 'bg-brand-blue/20 text-brand-blue shadow-sm'
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-white/5'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 帮助中心 - 从API动态加载 */}
        {activeTab !== 'materials' && (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="py-16 text-center text-brand-text-dim">
              暂无内容，管理员可在后台编辑
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((a) => (
                <details key={a.id} className="card-base p-4 group open:border-brand-blue transition-all">
                  <summary className="font-medium text-brand-text cursor-pointer list-none flex items-center justify-between">
                    <span>{a.title}</span>
                    <ChevronDown className="w-4 h-4 text-brand-text-dim group-open:rotate-180 transition-transform" />
                  </summary>
                  {a.content && (
                    <p className="mt-3 text-sm text-brand-text-muted leading-relaxed border-t border-brand-border pt-3 whitespace-pre-line">
                      {a.content}
                    </p>
                  )}
                </details>
              ))}
            </div>
          )
        )}

        {/* 材质说明（静态，后续可改为API） */}
        {activeTab === 'materials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MATERIAL_SECTIONS.map(m => (
              <div key={m.id} className="card-base p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-brand-text">
                    {m.icon} {m.name}
                  </h3>
                  <span className="text-brand-orange font-bold text-lg">{m.price}</span>
                </div>
                <p className="text-sm text-brand-text-muted mb-4 leading-relaxed">{m.desc}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  {[
                    ['密度', m.density],
                    ['强度', m.strength],
                    ['耐热', m.heat],
                    ['颜色', m.color],
                  ].map(([label, val]) => (
                    <div key={label as string} className="bg-brand-panel rounded-lg px-3 py-1.5">
                      <span className="text-brand-text-dim">{label}：</span>
                      <span className="text-brand-text-muted font-medium">{val as string}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-green-400 font-semibold mb-1">✅ 优点</div>
                    <ul className="text-xs text-brand-text-muted space-y-0.5">
                      {m.pros.map(p => <li key={p}>· {p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-red-400 font-semibold mb-1">⚠️ 缺点</div>
                    <ul className="text-xs text-brand-text-muted space-y-0.5">
                      {m.cons.map(c => <li key={c}>· {c}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
