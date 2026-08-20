import { Printer, ArrowRight, Zap, Layers, Box } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      {/* 网格背景 */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* 发光装饰 */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* 左侧文案 */}
          <div className="flex-1 text-center lg:text-left">
            {/* 状态标签 */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-blue/10 border border-brand-blue/30
                          rounded-full text-brand-blue text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-brand-blue rounded-full pulse-dot" />
              平台已上线 · 模型持续更新中
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              <span className="text-brand-text">将创意</span>
              <br />
              <span className="bg-gradient-to-r from-brand-orange to-brand-blue bg-clip-text text-transparent">
                变为现实
              </span>
            </h1>

            <p className="text-lg text-brand-text-muted max-w-xl mb-8 leading-relaxed">
              海量3D模型一键下单，专业级打印品质交付。
              <br className="hidden sm:block" />
              从模型选择到成品到手，全程透明追踪。
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link to="/official" className="btn-primary flex items-center gap-2 text-base">
                浏览官方模型
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/" className="btn-secondary flex items-center gap-2 text-base">
                <Box className="w-4 h-4" />
                社区模型市场
              </Link>
            </div>
          </div>

          {/* 右侧3D装饰占位 */}
          <div className="flex-1 w-full max-w-lg">
            <div className="relative aspect-square">
              {/* 旋转的装饰圈 */}
              <div className="absolute inset-0 border border-brand-border/50 rounded-2xl rotate-6 animate-pulse" />
              <div className="absolute inset-4 border border-brand-orange/20 rounded-2xl -rotate-3" />

              {/* 中央3D占位 */}
              <div className="absolute inset-8 bg-brand-card/80 backdrop-blur border border-brand-border
                            rounded-2xl flex flex-col items-center justify-center corner-decoration">
                <div className="w-20 h-20 bg-gradient-brand rounded-2xl flex items-center justify-center mb-4
                              shadow-brand-orange">
                  <Printer className="w-10 h-10 text-white" />
                </div>
                <span className="text-brand-text-muted font-mono text-sm">3D Preview Area</span>
                <span className="text-brand-text-dim font-mono text-xs mt-1">Three.js 渲染区</span>
              </div>

              {/* 浮动指标 */}
              <div className="absolute -top-2 right-8 bg-brand-card border border-brand-orange/40
                            rounded-lg px-3 py-2 shadow-card">
                <div className="text-xs text-brand-text-dim font-mono">精度</div>
                <div className="text-sm font-bold text-brand-orange">0.1mm</div>
              </div>
              <div className="absolute bottom-4 -left-4 bg-brand-card border border-brand-blue/40
                            rounded-lg px-3 py-2 shadow-card">
                <div className="text-xs text-brand-text-dim font-mono">材质</div>
                <div className="text-sm font-bold text-brand-blue">PLA / ABS</div>
              </div>
            </div>
          </div>
        </div>

        {/* 统计数字 */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {[
            { icon: Box, label: '模型数量', value: '2,400+', color: 'text-brand-orange' },
            { icon: Layers, label: '打印完成', value: '15,800+', color: 'text-brand-blue' },
            { icon: Zap, label: '平均交付', value: '2.5 天', color: 'text-brand-orange-light' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-brand-text-dim mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
