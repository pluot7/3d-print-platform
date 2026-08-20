"""
后端速率限制中间件 - 使用 slowapi
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import time
import re

# 创建限速器
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    storage_uri="memory://",  # 单进程内存存储（多 worker 不共享，上线建议换 Redis）
)


def add_rate_limiting(app: FastAPI):
    """给 FastAPI 应用添加速率限制"""
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    
    # 覆盖默认错误处理
    @app.exception_handler(429)
    async def rate_limit_handler(request: Request, exc):
        return JSONResponse(
            status_code=429,
            content={"detail": "请求太频繁，请稍后再试"},
            headers={"Retry-After": "60"},
        )
    
    print("[速率限制] 已启用（默认 60次/分钟，可单独覆盖）")
