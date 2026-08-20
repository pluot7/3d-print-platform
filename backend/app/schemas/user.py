from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ============ 用户相关 ============

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    """用户自行修改个人资料（支持修改手机号，需要验证码）"""
    username: Optional[str] = Field(None, min_length=1, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    phone_code: Optional[str] = None  # 修改手机号时需要的验证码


class ChangePasswordRequest(BaseModel):
    """修改密码"""
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6, max_length=50)


class NotificationPreferencesRequest(BaseModel):
    """通知偏好设置"""
    notify_activities: Optional[bool] = None
    notify_messages: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    balance: float = 0.00
    nova_coins: int = 0
    notify_activities: bool = True
    notify_messages: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ 钱包相关 ============

class RechargeRequest(BaseModel):
    amount: float = Field(..., gt=0, description="充值金额")
    payment_method: str = Field(default="alipay", description="支付方式: alipay/wechat")


class NovaCoinAward(BaseModel):
    user_id: int
    amount: int = Field(..., gt=0, le=100, description="赠送Nova豆数量")
    reason: str = Field(..., max_length=200, description="赠送原因")


# ============ 认证相关 ============

class LoginRequest(BaseModel):
    phone: str = Field(..., min_length=1, description="手机号或管理员账号")
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, description="手机号")
    password: str = Field(..., min_length=6, max_length=50)
    code: str = Field(..., min_length=4, max_length=6, description="短信验证码")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
