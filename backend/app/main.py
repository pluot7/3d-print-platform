from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.core.rate_limit import add_rate_limiting
from app.api import auth, models, orders, addresses, discussions, model_comments, cart, announcements, wallet, reports, notifications, materials, help, favorites
from app.api.auth import get_or_create_default_admin
from app.core.database import SessionLocal

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 创建上传目录
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "models"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由（在中间件之后，速率限制之前）
app.include_router(auth.router)
app.include_router(models.router)
app.include_router(orders.router)
app.include_router(addresses.router)
app.include_router(discussions.router)
app.include_router(model_comments.router)
app.include_router(cart.router)
app.include_router(announcements.router)
app.include_router(wallet.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(materials.router)
app.include_router(help.router)
app.include_router(favorites.router)

# 速率限制（在所有路由注册之后、启动事件之前）
add_rate_limiting(app)

# 静态文件（上传的文件）
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ============ 启动时初始化 ============

@app.on_event("startup")
def on_startup():
    """启动时确保超级管理员账号存在"""
    try:
        db = SessionLocal()
        get_or_create_default_admin(db)
        db.close()
    except Exception as e:
        print(f"[启动] 超级管理员创建失败: {e}")


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "后端服务正常运行中 🚀"}
