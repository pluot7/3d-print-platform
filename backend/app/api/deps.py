from __future__ import annotations
"""
认证依赖 - 从请求中提取当前用户
"""
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """从 Authorization Bearer token 获取当前用户"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header[7:]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效或过期的登录凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    phone = payload.get("sub")
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的登录凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    return user


# ============ 可选认证（未登录也能访问） ============


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """从 Authorization Bearer token 获取当前用户，未登录返回 None"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    payload = verify_token(token)
    if not payload:
        return None

    phone = payload.get("sub")
    if not phone:
        return None

    user = db.query(User).filter(User.phone == phone).first()
    if not user or not user.is_active:
        return None

    return user


# ============ 管理员认证 ============

def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """要求当前用户是管理员"""
    if current_user.role.value != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return current_user
