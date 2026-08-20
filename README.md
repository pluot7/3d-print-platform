# 打个东西 · 3D打印智能制造电商平台

一个本地化的 3D 打印电商 + 社区平台。用户可上传 3D 模型、在线配置打印参数（材料/层高/填充率/缩放）、获取基于真实切片引擎的精准报价，并完成下单支付。同时内置社区讨论、私信、关注、动态、通知等社交系统，以及完整的模型展示与分享功能。

> 本项目由 FastAPI 后端 + 两个独立 Vite 前端（用户前台 + 管理后台）组成，可完全本地运行，无需任何第三方付费服务。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | FastAPI 0.124 + SQLAlchemy 2.0 + Pydantic 2.10 + PyJWT + MySQL/SQLite |
| 前台前端 | React 18 + TypeScript + Vite 5 + Tailwind CSS |
| 管理后台 | 独立 Vite 项目（React 18 + TypeScript）|
| 3D 切片 | BambuStudio CLI（精确计算耗材重量）|
| 模型预览 | Google `<model-viewer>` Web Component |
| 部署架构 | 三端口：前台 3000 / 管理端 3002 / 后端 8001 |

## 功能特性

- 🔐 **用户认证**：手机号 + 验证码注册/登录，演示码 `123456`
- 📦 **模型管理**：3MF/GLB 上传、详情展示、颜色预览、缩放打印（25%~300%）
- ⚖️ **精准重量计算**：调用 BambuStudio CLI 真实切片，耗材重量偏差 ±2%
- 🛒 **购物流程**：购物车 → 结算 → 逐件下单 → 支付弹窗
- 💰 **钱包系统**：余额 + Nova豆折扣，支持余额支付与微信/支付宝模拟支付
- 💬 **社区社交**：讨论发布、嵌套评论、私信三栏、关注/动态/通知
- 🎯 **管理后台**：订单/模型/用户/公告/评论/材料/帮助/举报 多面板管理

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. 后端配置

```bash
cd backend
pip install -r requirements.txt

# 复制环境变量模板并填入你的配置
cp .env.example .env
# 编辑 .env，至少填写 MYSQL_PASSWORD 和 SECRET_KEY
```

### 3. 数据库

```bash
# 确保本地 MySQL 已启动，创建数据库
mysql -u root -p -e "CREATE DATABASE 3dprint CHARACTER SET utf8mb4;"
```

### 4. 启动后端

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 5. 启动前台前端

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

### 6. 启动管理后台（可选）

```bash
cd admin
npm install
npm run dev
# 访问 http://localhost:3002
```

## 配置说明

### BambuStudio 切片引擎（可选但推荐）

为了获得精准的打印重量与报价，建议安装 [BambuStudio](https://github.com/bambulab/BambuStudio) 并在 `.env` 中配置 `BAMBU_STUDIO_PATH` 指向其可执行文件。未配置时系统会回退到粗略重量估算。

### 环境变量

详见 [`.env.example`](.env.example)。

## 项目结构

```
3d/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── api/      # 路由层
│   │   ├── models/   # 数据库模型
│   │   ├── schemas/  # Pydantic 模型
│   │   ├── core/     # 配置/数据库/安全
│   │   └── utils/    # 切片引擎封装/模型工具
│   └── requirements.txt
├── frontend/         # 用户前台（React + Vite）
└── admin/            # 管理后台（独立 React + Vite 项目）
```

## License

MIT
