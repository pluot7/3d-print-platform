from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Request
from sqlalchemy.orm import Session
import traceback
import random
import re
from typing import List
import os
import uuid
from fastapi import UploadFile, File
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.user import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
)
from app.api.deps import get_current_user, get_admin_user
from app.core.rate_limit import limiter

router = APIRouter(prefix="/api/auth", tags=["认证"])

# ============ 默认管理员账号 ============
DEFAULT_ADMIN_PHONE = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_ADMIN_USERNAME = "管理员"


def get_or_create_default_admin(db: Session) -> User:
    """确保默认管理员账号存在（启动时调用）"""
    admin = db.query(User).filter(
        User.role == UserRole.ADMIN
    ).first()
    if admin:
        return admin

    admin = User(
        username=DEFAULT_ADMIN_USERNAME,
        phone=DEFAULT_ADMIN_PHONE,
        hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print(f"[启动] 默认管理员账号已创建: {DEFAULT_ADMIN_USERNAME} / {DEFAULT_ADMIN_PHONE}")
    return admin


# ============ 短信验证码（演示模式） ============

# 内存存储验证码（演示用，上线后替换为 Redis）
_verify_codes: dict[str, str] = {}

DEMO_CODE = "123456"


@router.post("/send-code")
def send_sms_code(phone: str, db: Session = Depends(get_db)):
    """发送短信验证码（演示模式：统一验证码 123456）"""
    # 手机号基本校验
    if not re.match(r'^1[3-9]\d{9}$', phone):
        raise HTTPException(status_code=400, detail="请输入有效的手机号")

    # 演示模式：验证码固定为 123456
    _verify_codes[phone] = DEMO_CODE
    print(f"[SMS 演示] 发送验证码 {DEMO_CODE} 到 {phone}")

    return {
        "message": "验证码已发送（演示模式：123456）",
        "phone_masked": phone[:3] + "****" + phone[-4:],
    }
@router.post("/reset-password")
def reset_password(
    phone: str = Body(...),
    code: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(get_db),
):
    """通过手机号+验证码重置密码（无需登录）"""
    # 验证码校验
    if not verify_sms_code(phone, code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    
    # 检查用户是否存在
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="该手机号未注册")
    
    # 更新密码
    user.hashed_password = get_password_hash(new_password)
    _verify_codes.pop(phone, None)
    db.commit()
    
    return {"message": "密码重置成功，请使用新密码登录"}





def verify_sms_code(phone: str, code: str) -> bool:
    """校验验证码（演示模式）"""
    expected = _verify_codes.get(phone)
    return expected is not None and expected == code


# ============ 注册 ============

@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """手机号注册（需短信验证码）"""
    try:
        # 验证码校验
        if not verify_sms_code(request.phone, request.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误或已过期",
            )

        # 检查手机号是否已注册
        existing = db.query(User).filter(User.phone == login_req.phone).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该手机号已注册",
            )

        # 清理验证码（演示模式可省略）
        _verify_codes.pop(request.phone, None)

        # 创建用户
        user = User(
            username=f"用户_{request.phone[-4:]}",  # 自动生成用户名
            phone=request.phone,
            hashed_password=get_password_hash(request.password),
            role=UserRole.USER,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        access_token = create_access_token(data={"sub": user.phone, "role": user.role.value})
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in register: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器错误: {str(e)}",
        )


# ============ 登录 ============

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(login_req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """手机号/管理员标识 + 密码登录"""
    try:
        # 查询用户（按手机号）
        user = db.query(User).filter(User.phone == login_req.phone).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="手机号或密码错误",
            )

        # 验证密码
        if not verify_password(login_req.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="手机号或密码错误",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="账号已被禁用",
            )

        # 生成 token（sub 用 phone 统一标识）
        access_token = create_access_token(data={"sub": user.phone, "role": user.role.value})
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in login: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器错误: {str(e)}",
        )


# ============ 获取当前用户信息 ============

@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """获取当前登录用户信息"""
    return UserResponse.model_validate(current_user)


# ============ 管理员：用户管理 ============

@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """获取所有用户列表（管理员用）"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}/role")
def set_user_role(
    user_id: int,
    role: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """设置用户角色（管理员用）"""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="不能修改自己的角色啊！")

    if role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail=f"无效角色: {role}，可选: {[r.value for r in UserRole]}")

    target.role = UserRole(role)
    db.commit()
    db.refresh(target)

    return {
        "message": f"用户 {target.username} 的角色已更新为 {role}",
        "user": UserResponse.model_validate(target),
    }


@router.post("/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传头像"""
    # 校验文件类型
    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式，支持: {allowed}")

    # 保存文件
    avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(avatar_dir, filename)

    content = file.file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="头像文件不能超过5MB")

    with open(filepath, "wb") as f:
        f.write(content)

    # 更新用户头像字段
    avatar_url = f"uploads/avatars/{filename}"
    user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)

    return {"avatar_url": avatar_url}


@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用户修改个人资料（昵称/手机号/头像）"""
    if data.username is not None:
        # 检查重名
        existing = db.query(User).filter(User.username == data.username, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="该昵称已被使用")
        user.username = data.username
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url

    # 修改手机号：需要验证验证码
    if data.phone is not None:
        if not data.phone_code:
            raise HTTPException(status_code=400, detail="修改手机号需要验证码")
        # 检查新手机号是否已被其他用户绑定
        existing_phone = db.query(User).filter(
            User.phone == data.phone, User.id != user.id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="该手机号已被其他账号绑定")
        # 验证短信验证码
        if not verify_sms_code(data.phone, data.phone_code):
            raise HTTPException(status_code=400, detail="验证码错误或已过期")
        user.phone = data.phone

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.put("/password")
def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用户修改密码"""
    if not verify_password(data.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="原密码错误")
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "密码修改成功"}
