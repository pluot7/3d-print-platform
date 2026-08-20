import { Link } from 'react-router-dom'
import { Printer, Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-brand-panel border-t border-brand-border mt-auto">
      {/* 底部装饰线 */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 品牌 */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-brand-text">
                3D<span className="text-brand-orange">Print</span>
              </span>
            </div>
            <p className="text-sm text-brand-text-dim leading-relaxed">
              打个东西 - 3D打印智造中心
              <br />从创意到实物，一键成型
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-sm font-semibold text-brand-text mb-4">快速链接</h4>
            <ul className="space-y-2">
              {['模型市场', '官方模型', '上传模型', '价格说明'].map((item, i) => {
                const links: Record<string, string> = {
                  '模型市场': '/',
                  '官方模型': '/official',
                  '上传模型': '/user',
                  '价格说明': '/pricing',
                }
                return (
                  <li key={i}>
                    <Link to={links[item]} className="text-sm text-brand-text-dim hover:text-brand-blue transition-colors">
                      {item}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* 服务支持 */}
          <div>
            <h4 className="text-sm font-semibold text-brand-text mb-4">服务支持</h4>
            <ul className="space-y-2">
              {['帮助中心', '打印指南', '材质说明', '售后服务'].map((item, i) => {
                const tabs: Record<string, string> = {
                  '帮助中心': '/help',
                  '打印指南': '/help/guide',
                  '材质说明': '/help/materials',
                  '售后服务': '/help/service',
                }
                return (
                  <li key={i}>
                    <Link to={tabs[item]} className="text-sm text-brand-text-dim hover:text-brand-blue transition-colors">
                      {item}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h4 className="text-sm font-semibold text-brand-text mb-4">联系我们</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-brand-text-dim">
                <Phone className="w-4 h-4 text-brand-orange" />
                400-XXX-XXXX
              </li>
              <li className="flex items-center gap-2 text-sm text-brand-text-dim">
                <Mail className="w-4 h-4 text-brand-blue" />
                support@3dprint.com
              </li>
              <li className="flex items-start gap-2 text-sm text-brand-text-dim">
                <MapPin className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                公司地址待填写
              </li>
            </ul>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="mt-10 pt-6 border-t border-brand-border/50 flex flex-col sm:flex-row
                      items-center justify-between gap-4">
          <p className="text-xs text-brand-text-dim">
            © 2026 3DPrint Studio. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-brand-text-dim">
            <a href="#" className="hover:text-brand-blue transition-colors">隐私政策</a>
            <a href="#" className="hover:text-brand-blue transition-colors">用户协议</a>
            <a href="#" className="hover:text-brand-blue transition-colors">ICP备案</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
